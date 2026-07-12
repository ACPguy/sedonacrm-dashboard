export const config = { maxDuration: 120 };

import { createServerClient } from '../../../lib/supabaseServer';

// ── Hard-exclude: skip immediately, no phrase check ──────────────────────────

const HARD_EXCLUDE_DOMAINS = ['intuit.com', 'quickbooks.com'];

// Specific Google notification senders (display name or known address patterns)
const HARD_EXCLUDE_ADDRESSES = [
  'googlealerts-noreply@google.com',           // Google Alerts
  'noreply@workspaceupdates.withgoogle.com',   // Google Workspace Updates
  'calendar-notification@google.com',          // Google Calendar notifications
];
const HARD_EXCLUDE_NAME_PATTERNS = [
  /^google alerts$/i,
  /^google workspace updates/i,
  /^google calendar$/i,
];

function isHardExcluded(address, displayName) {
  if (!address) return false;
  const domain = address.split('@')[1]?.toLowerCase() || '';
  if (HARD_EXCLUDE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) return true;
  if (HARD_EXCLUDE_ADDRESSES.includes(address.toLowerCase())) return true;
  if (displayName && HARD_EXCLUDE_NAME_PATTERNS.some(p => p.test(displayName))) return true;
  return false;
}

// ── Hard-include: pass immediately regardless of phrase content ───────────────

function isHardIncluded(address, subject, snippet) {
  if (!address) return false;
  const addrLower = address.toLowerCase();
  const subjectLower = (subject || '').toLowerCase();
  const bodyLower = (snippet || '').toLowerCase();

  // NumberBarn hotline voicemails
  if (addrLower === 'voicemail@numberbarn.com') {
    const text = subjectLower + ' ' + bodyLower;
    if (text.includes('399-4040') || text.includes('for lease line')) return true;
  }

  // Podio leasing-call notifications — narrow to "New Leasing Call" subject only
  const domain = addrLower.split('@')[1] || '';
  if (domain === 'automation.podio.com' && subjectLower.includes('new leasing call')) return true;

  return false;
}

// ── Strong-phrase word-boundary matching (only tier — no weak-phrase bypass) ──

const STRONG_PHRASES = [
  /\bfor lease\b/i,
  /\bfor rent\b/i,
  /\bspace available\b/i,
  /\bavailable for lease\b/i,
  /\bleasing inquiry\b/i,
  /\binterested in leasing\b/i,
  /\bcommercial space for\b/i,
  /\bretail space for\b/i,
  /\boffice space for\b/i,
  /\bsquare feet available\b/i,
];

function checkPhrases(text) {
  if (!text) return { pass: false, reason: 'no leasing signal' };
  if (STRONG_PHRASES.some(re => re.test(text))) return { pass: true, reason: 'strong phrase match' };
  return { pass: false, reason: 'no leasing signal' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_PROP_CODES = new Set([
  '1McC','777','ACP','ART','ARVS','ATS','CDY','CHQ','COB','CPP','CR1','CRMS','CVP',
  'DCC','DCM','DCP','DEM','DON','FOX','KOD','KTA','LAP','LASO','LEEN','LPP','MILL',
  'MYN','OLY','OMP','PLZ','PW213','PWP','RHS','RR','SAC','SEP','SS','SSB','STP',
  'SUNT','SWV','SYC','VDN','VVP','WAL','WNT','WSP','YAV',
]);

const SCOTT_USER_ID = '573b65b5-ba16-437b-9101-d0bff2453dde';

function parseClaudeJson(raw) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end();
  }

  const sb = createServerClient();

  const isCron = req.headers['x-vercel-cron'] === '1' ||
                 req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;

  // Plain GET (no cron header) — return active drafts for the UI card
  if (req.method === 'GET' && !isCron) {
    const { data, error } = await sb
      .from('inquiry_drafts')
      .select('id, prospect_name, prospect_email, subject, body, status, created_at, leasing_pipeline(prop_code)')
      .in('status', ['draft', 'edited'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(
      (data || []).map(d => ({ ...d, body: d.body ? d.body.slice(0, 200) : null }))
    );
  }

  // Cron GET or manual POST — require auth
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
    if (draftedThreadIds.has(thread.id)) {
      results.skipped.push({ thread: thread.subject, reason: 'already drafted' });
      continue;
    }

    // Find first inbound message for sender info
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

    // 3. Hard-exclude check
    if (isHardExcluded(from_address, from_name)) {
      results.skipped.push({ thread: thread.subject, reason: 'hard-excluded sender' });
      continue;
    }

    const searchText = `${thread.subject || ''} ${thread.snippet || ''}`;

    // 4. Hard-include check
    const hardInclude = isHardIncluded(from_address, thread.subject, thread.snippet);

    // 5. Phrase check — strong phrases only, runs unless hard-included
    let phraseResult = { pass: true, reason: 'hard-include' };
    if (!hardInclude) {
      phraseResult = checkPhrases(searchText);
      if (!phraseResult.pass) {
        results.skipped.push({ thread: thread.subject, reason: phraseResult.reason });
        continue;
      }
    }

    // 6. Known-contact lookup — tagging only, never passes or skips on its own
    let source_note = null;
    if (from_address) {
      const { data: contactMatch } = await sb
        .from('contacts')
        .select('id, full_name, category')
        .ilike('email', from_address)
        .limit(1)
        .maybeSingle();
      if (contactMatch) {
        source_note = `Existing contact — verify (${contactMatch.category || 'Unknown'})`;
      }
    }

    try {
      // 7. Claude API — draft reply
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
          model: 'claude-sonnet-5',
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

      // 8. Insert to leasing_pipeline
      const { data: pipeline, error: pipelineErr } = await sb
        .from('leasing_pipeline')
        .insert({
          stage: 'New Inquiry',
          status: 'active',
          source: 'email',
          source_note,
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

      // 9. Insert to inquiry_drafts
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

      // 10. Update email_thread link
      await sb
        .from('email_threads')
        .update({
          linked_record_type: 'leasing_pipeline',
          linked_record_id: pipeline.id,
          link_status: 'auto_linked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', thread.id);

      results.generated.push({
        prospect: from_name || from_address,
        subject: thread.subject,
        source_note,
        match_reason: hardInclude ? 'hard-include' : phraseResult.reason,
      });
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
