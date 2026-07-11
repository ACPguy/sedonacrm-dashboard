// POST — notice-to-vacate cross-phase trigger
// Effect (Phase 5 side only — trigger mechanism is Phase 4 / Tenancy Lifecycle):
//   1. Sets suites.status → "Vacant / For Lease — Pending"
//   2. Auto-creates a new leasing_pipeline record (stage=New Inquiry,
//      pipeline_source=notice_triggered, departing_tenant_id=tenant_id)
import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isAuth = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

  const { tenant_id, suite_id, prop_code, notice_date, notes } = req.body || {};

  if (!tenant_id)  return res.status(400).json({ error: 'tenant_id is required' });
  if (!suite_id)   return res.status(400).json({ error: 'suite_id is required' });
  if (!prop_code)  return res.status(400).json({ error: 'prop_code is required' });

  const sb = createServerClient();

  // Verify suite exists and belongs to the given prop_code
  const { data: suite, error: suiteErr } = await sb
    .from('suites')
    .select('id, prop_code, suite_num, sqft, status')
    .eq('id', suite_id)
    .single();

  if (suiteErr || !suite) {
    return res.status(404).json({ error: 'Suite not found' });
  }
  if (suite.prop_code !== prop_code) {
    return res.status(400).json({ error: 'suite_id does not match prop_code' });
  }

  // 1. Update suite status to "Vacant / For Lease — Pending"
  const { error: suiteUpdateErr } = await sb
    .from('suites')
    .update({ status: 'Vacant / For Lease — Pending' })
    .eq('id', suite_id);

  if (suiteUpdateErr) {
    console.error('[api/pipeline/notice-to-vacate] suite update:', suiteUpdateErr);
    return res.status(500).json({ error: suiteUpdateErr.message });
  }

  // 2. Auto-create new pipeline record for next-tenant search
  const noticeStr = notice_date || new Date().toISOString().slice(0, 10);
  const internalNote = `Auto-created from notice-to-vacate trigger. Notice date: ${noticeStr}.${notes ? ` Notes: ${notes}` : ''}`;

  const { data: newPipeline, error: pipeErr } = await sb
    .from('leasing_pipeline')
    .insert({
      prop_code,
      suite_id,
      suite_num:           suite.suite_num,
      sqft:                suite.sqft,
      stage:               'New Inquiry',
      status:              'Active',
      pipeline_source:     'notice_triggered',
      departing_tenant_id: tenant_id,
      stage_5_state:       'pending',
      stage_7_state:       'pending',
      internal_notes:      internalNote,
    })
    .select()
    .single();

  if (pipeErr) {
    console.error('[api/pipeline/notice-to-vacate] pipeline insert:', pipeErr);
    // Suite was already updated — report partial success so caller can handle
    return res.status(500).json({
      error:         pipeErr.message,
      suite_updated: true,
      pipeline_created: false,
    });
  }

  return res.status(201).json({
    suite_updated:    true,
    pipeline_created: true,
    new_pipeline:     newPipeline,
    suite_status:     'Vacant / For Lease — Pending',
  });
}
