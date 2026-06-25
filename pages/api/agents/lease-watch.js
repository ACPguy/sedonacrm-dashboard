export const config = { maxDuration: 120 };

import { createServerClient } from '../../../lib/supabaseServer';

// Arizona is UTC-7, no DST
function getAZDate() {
  const now = new Date();
  const azOffset = -7 * 60;
  const azTime = new Date(now.getTime() + (azOffset - now.getTimezoneOffset()) * 60000);
  return azTime.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end();
  }

  const sb = createServerClient();

  if (req.method === 'GET') {
    const { data, error } = await sb
      .from('lease_watch_drafts')
      .select('*, tenants(tenant_dba, podio_id, id)')
      .in('status', ['draft', 'edited', 'approved'])
      .order('lease_ends', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // POST — auth check
  const isCron = req.headers['x-vercel-cron'] === '1';
  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const today = getAZDate();
  const todayDate = new Date(today);

  const { data: tenants } = await sb
    .from('tenants')
    .select('id, tenant_dba, prop_code, lease_ends, suite_num, primary_contact_id, contacts!primary_contact_id(full_name, email)')
    .eq('tenant_status', 'Active')
    .eq('lease_status', 'Active')
    .not('lease_ends', 'is', null)
    .gt('lease_ends', today)
    .order('lease_ends', { ascending: true });

  const { data: properties } = await sb
    .from('properties')
    .select('prop_code, address, city, state, zip')
    .eq('status', 'active');
  const propMap = Object.fromEntries((properties || []).map(p => [p.prop_code, p]));

  const { data: existingDrafts } = await sb
    .from('lease_watch_drafts')
    .select('tenant_id, milestone, status');
  const draftSet = new Set((existingDrafts || []).map(d => `${d.tenant_id}:${d.milestone}`));

  const results = { generated: [], skipped: [], errors: [] };

  const milestones = [
    { key: '12mo', min: 335, max: 365 },
    { key: '6mo',  min: 150, max: 185 },
    { key: '3mo',  min: 75,  max: 95  },
    { key: '2mo',  min: 45,  max: 65  },
    { key: '1mo',  min: 1,   max: 35  },
  ];

  const milestoneLabels = { '12mo': '12 months', '6mo': '6 months', '3mo': '3 months', '2mo': '2 months', '1mo': '1 month' };

  for (const tenant of (tenants || [])) {
    const leaseEnd = new Date(tenant.lease_ends);
    const daysRemaining = Math.ceil((leaseEnd - todayDate) / (1000 * 60 * 60 * 24));

    for (const ms of milestones) {
      if (daysRemaining < ms.min || daysRemaining > ms.max) continue;

      const draftKey = `${tenant.id}:${ms.key}`;
      if (draftSet.has(draftKey)) {
        results.skipped.push({ tenant: tenant.tenant_dba, milestone: ms.key, reason: 'already exists' });
        continue;
      }

      try {
        const prop = propMap[tenant.prop_code] || {};
        const propAddress = prop.address
          ? `${prop.address}, ${prop.city}, ${prop.state} ${prop.zip}`
          : tenant.prop_code;
        const contactName = tenant.contacts?.full_name || null;
        const contactEmail = tenant.contacts?.email || null;

        const prompt = `You are drafting a professional lease expiration notice email on behalf of Scott Anderson, CCIM at Anderson Commercial Properties in Sedona, Arizona.

Tenant: ${tenant.tenant_dba}
Property: ${propAddress} (${tenant.prop_code})
Suite: ${tenant.suite_num || 'N/A'}
Lease expiration date: ${tenant.lease_ends}
Days remaining: ${daysRemaining}
Milestone: ${milestoneLabels[ms.key]} notice
Contact name: ${contactName || 'there'}

Tone guidelines by milestone:
- 12mo: Casual, relationship-focused early heads-up. No urgency.
- 6mo: Friendly but proactive. Suggest starting renewal conversation.
- 3mo: Warmer urgency. Time to make a decision. Offer to discuss terms.
- 2mo: Direct. Lease expiring soon. Action needed. Professional and respectful.
- 1mo: Urgent and clear. Final notice. They need to respond immediately.

Write a complete email with:
1. Subject line as first line formatted exactly as: Subject: [subject here]
2. Blank line
3. Email body — salutation through sign-off

Sign off as:
Scott Anderson, CCIM
Anderson Commercial Properties
(928) 282-9400

Rules:
- Use the actual tenant name, not placeholders
- Keep body under 200 words
- Do not mention specific dollar amounts
- Sound like a real person, not a form letter
- Do not start with "I hope this email finds you well"`;

        const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 600,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        const apiData = await apiRes.json();
        const rawText = apiData.content?.[0]?.text || '';
        const lines = rawText.trim().split('\n');
        const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
        const subject = subjectLine
          ? subjectLine.replace(/^subject:\s*/i, '').trim()
          : `Lease Expiration Notice — ${tenant.tenant_dba}`;
        const bodyStartIdx = subjectLine ? lines.indexOf(subjectLine) + 1 : 0;
        const body = lines.slice(bodyStartIdx).join('\n').trim();

        await sb.from('lease_watch_drafts').upsert({
          tenant_id: tenant.id,
          prop_code: tenant.prop_code,
          milestone: ms.key,
          lease_ends: tenant.lease_ends,
          days_remaining: daysRemaining,
          to_email: contactEmail,
          to_name: contactName,
          subject,
          body,
          status: 'draft',
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,milestone' });

        results.generated.push({ tenant: tenant.tenant_dba, milestone: ms.key, days: daysRemaining });
        draftSet.add(draftKey);

      } catch (err) {
        results.errors.push({ tenant: tenant.tenant_dba, milestone: ms.key, error: err.message });
      }
    }
  }

  return res.status(200).json({
    today,
    ...results,
    total_generated: results.generated.length,
    total_skipped: results.skipped.length,
    total_errors: results.errors.length,
  });
}
