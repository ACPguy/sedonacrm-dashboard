export const config = { maxDuration: 120 };

import { createServerClient } from '../../../lib/supabaseServer';

const LEASING_KEYWORDS = [
  'available', 'lease', 'leasing', 'space', 'sq ft', 'square feet',
  'office', 'retail', 'suite', 'rent', 'commercial', 'inquir',
  'interest', 'property', 'location', 'tenant', 'move in', 'moving',
];

const VALID_PROP_CODES = new Set([
  '1McC','777','ACP','ART','ARVS','ATS','CDY','CHQ','COB','CPP','CR1','CRMS','CVP',
  'DCC','DCM','DCP','DEM','DON','FOX','KOD','KTA','LAP','LASO','LEEN','LPP','MILL',
  'MYN','OLY','OMP','PLZ','PW213','PWP','RHS','RR','SAC','SEP','SS','SSB','STP',
  'SUNT','SWV','SYC','VDN','VVP','WAL','WNT','WSP','YAV',
]);

const SCOTT_USER_ID = '573b65b5-ba16-437b-9101-d0bff2453dde';

function hasLeasingKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return LEASING_KEYWORDS.some(kw => lower.includes(kw));
}

function parseClaudeJson(raw) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end();
  }

  const sb = createServerClient();

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('inquiry_drafts')
      .select('id, prospect_name, prospect_email, subject, body, status, created_at')
      .in('status', ['draft', 'edited'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(
      (data || []).map(d => ({ ...d, body: d.body ? d.body.slice(0, 200) : null }))
    );
  }

  // POST — auth
  const isCron = req.headers['x-vercel-cron'] === '1';
  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Dismiss action
  const body = req.body || {};
  if (body.action === 'dismiss' && body.id) {
    const { error: updateErr } = await sb
      .from('inquiry_drafts')
      .update({ status: 'dismissed' })
      .eq('id', body.id);
    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.status(200).json({ ok: true });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const results = { generated: [], skipped: [], errors: [] };

  // 1. Fetch recent unprocessed threads with their messages
  const { data: threads, error: threadsErr } = await sb
    .from('email_threads')
    .select('id, gmail_thread_id, subject, snippet, created_at, email_messages(from_name, from_address, is_outbound, received_at)')
    .gte('created_at', cutoff.toISOString())
    .or('linked_record_type.is.null,linked_record_type.neq.leasing_pipeline')
    .order('created_at', { ascending: false })
    .limit(50);

  if (threadsErr) return res.status(500).json({ error: threadsErr.message });
  if (!threads?.length) return res.status(200).json({ ...results, total_generated: 0, total_skipped: 0, total_errors: 0 });

  // 2. Dedup — threads already in inquiry_drafts
  const { data: existingDrafts } = await sb
    .from('inquiry_drafts')
    .select('thread_id');
  const draftedThreadIds = new Set((existingDrafts || []).map(d => d.thread_id));

  for (const thread of threads) {
    // dedup
    if (draftedThreadIds.has(thread.id)) {
      results.skipped.push({ thread: thread.subject, reason: 'already drafted' });
      continue;
    }

    // find first inbound message for sender info
    const inbound = (thread.email_messages || [])
      .filter(m => !m.is_outbound)
      .sort((a, b) => new Date(a.received_at) - new Date(b.received_at));
    const firstMsg = inbound[0];
    if (!firstMsg) {
      results.skipped.push({ thread: thread.subject, reason: 'no inbound message' });
      continue;
    }

    const from_name = firstMsg.from_name || null;
    const from_address = firstMsg.from_address || null;

    // 3. Keyword filter
    const searchText = `${thread.subject || ''} ${thread.snippet || ''}`;
    if (!hasLeasingKeyword(searchText)) {
      results.skipped.push({ thread: thread.subject, reason: 'no leasing keywords' });
      continue;
    }

    // 4. Known-contact check
    let known_contact = false;
    if (from_address) {
      const { data: contactMatch } = await sb
        .from('contacts')
        .select('id')
        .ilike('email', from_address)
        .limit(1)
        .maybeSingle();
      if (contactMatch) known_contact = true;
    }

    try {
      // 5. Claude API — draft reply
      const prompt = `Prospect: ${from_name || 'Unknown'} <${from_address || 'unknown'}>
Subject: ${thread.subject || '(no subject)'}
Message: ${thread.snippet || '(no content)'}

Draft a reply email and return JSON only with these exact fields:
{
  "subject": "Re: [original subject]",
  "body": "[full email draft]",
  "space_type_interest": "[extracted or null]",
  "size_sqft_interest": "[extracted number or null]",
  "prop_code": "[if specific property mentioned, match to ACP prop_codes, else null]"
}`;

      const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: 'You are an assistant for Anderson Commercial Properties, a commercial property management company in Sedona, Arizona. Scott Anderson, CCIM manages 14 NNN commercial properties. Draft a warm, professional response to this leasing inquiry. Be specific to what they asked. Sign off as Scott Anderson, CCIM | Anderson Commercial Properties | 928-282-9400. Extract any mentioned space size, type, or timing needs. Keep response under 200 words. Return only valid JSON, no markdown.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const apiData = await apiRes.json();
      if (!apiRes.ok) {
        throw new Error(`Anthropic API error ${apiRes.status}: ${apiData.error?.message || JSON.stringify(apiData)}`);
      }

      const rawText = apiData.content?.[0]?.text || '';
      if (!rawText) throw new Error('Empty response from Claude');

      let parsed;
      try {
        parsed = parseClaudeJson(rawText);
      } catch {
        throw new Error(`Failed to parse Claude JSON: ${rawText.slice(0, 200)}`);
      }

      const claudeSubject = parsed.subject || `Re: ${thread.subject || '(no subject)'}`;
      const claudeBody = parsed.body || '';
      const spaceType = parsed.space_type_interest || null;
      const rawSqft = parsed.size_sqft_interest;
      const sizeSqft = rawSqft ? parseInt(String(rawSqft).replace(/[^0-9]/g, ''), 10) || null : null;
      const rawPropCode = parsed.prop_code || null;
      const propCode = rawPropCode && VALID_PROP_CODES.has(rawPropCode) ? rawPropCode : null;

      // 6. Insert to leasing_pipeline
      const { data: pipeline, error: pipelineErr } = await sb
        .from('leasing_pipeline')
        .insert({
          stage: 'Inquiry',
          status: 'active',
          source: 'email',
          prospect_name: from_name,
          prospect_email: from_address,
          initial_message: thread.snippet,
          space_type_interest: spaceType,
          size_sqft_interest: sizeSqft,
          prop_code: propCode,
          created_by: SCOTT_USER_ID,
        })
        .select('id')
        .single();

      if (pipelineErr) throw new Error(`Pipeline insert: ${pipelineErr.message}`);

      // 7. Insert to inquiry_drafts
      const { error: draftErr } = await sb
        .from('inquiry_drafts')
        .insert({
          thread_id: thread.id,
          pipeline_id: pipeline.id,
          prospect_name: from_name,
          prospect_email: from_address,
          subject: claudeSubject,
          body: claudeBody,
          status: 'draft',
        });

      if (draftErr) throw new Error(`Draft insert: ${draftErr.message}`);

      // 8. Update email_thread link
      await sb
        .from('email_threads')
        .update({
          linked_record_type: 'leasing_pipeline',
          linked_record_id: pipeline.id,
          link_status: 'auto_linked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', thread.id);

      results.generated.push({ prospect: from_name || from_address, subject: thread.subject, known_contact });
      draftedThreadIds.add(thread.id);

    } catch (err) {
      results.errors.push({ thread: thread.subject, error: err.message });
    }
  }

  return res.status(200).json({
    today: new Date().toISOString().slice(0, 10),
    ...results,
    total_generated: results.generated.length,
    total_skipped: results.skipped.length,
    total_errors: results.errors.length,
  });
}
