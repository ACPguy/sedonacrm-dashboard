// GET ?pipeline_id=... — check 5 move-in clearance gates for Stage 9→10 transition
// Gates 1+2 (lease signing) combined until Dropbox Sign webhook built (Stage 3)
// Gate 3 (invoices paid) requires QBO integration — returns null until built
import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const isAuth = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });

  const { pipeline_id } = req.query;
  if (!pipeline_id) return res.status(400).json({ error: 'pipeline_id is required' });

  const sb = createServerClient();

  const { data: deal, error: dealErr } = await sb
    .from('leasing_pipeline')
    .select('id, prop_code, tenant_id, suite_id, stage, lease_signed_via_hellosign, acp_invoice_id')
    .eq('id', pipeline_id)
    .single();

  if (dealErr || !deal) {
    return res.status(404).json({ error: 'Pipeline record not found' });
  }

  // Gate 1+2: Lease signed by all parties (combined until Stage 3 Dropbox Sign)
  const leaseSigned = deal.lease_signed_via_hellosign === true;

  // Gate 3: QBO invoices paid — requires QBO webhook (Stage 6 integration), null for now
  const invoicesPaid = null;

  // Gate 4: COI received and active for this tenant
  let coiApproved = false;
  if (deal.tenant_id) {
    const { data: cois } = await sb
      .from('tnt_cois')
      .select('id, coi_status, additional_insured_status, expiry_date')
      .eq('tenant_id', deal.tenant_id)
      .eq('coi_status', 'Active')
      .gte('expiry_date', new Date().toISOString().slice(0, 10));
    coiApproved = Array.isArray(cois) && cois.length > 0 &&
      cois.some(c => c.additional_insured_status === 'Added');
  }

  // Gate 5: No open high-priority (Urgent) work orders for this property
  let noBlockingWOs = false;
  if (deal.prop_code) {
    const { data: openWOs } = await sb
      .from('work_orders')
      .select('id')
      .eq('prop_code', deal.prop_code)
      .eq('priority', 'Urgent')
      .neq('status', 'Closed')
      .limit(1);
    noBlockingWOs = !openWOs || openWOs.length === 0;
  }

  const gates = {
    lease_signed:        leaseSigned,   // gates 1+2 combined
    invoices_paid:       invoicesPaid,  // null = pending QBO integration
    coi_approved:        coiApproved,
    no_blocking_wo:      noBlockingWOs,
  };

  // all_clear: true only when all non-null gates pass
  const resolved = Object.values(gates).filter(v => v !== null);
  const allClear = resolved.length === Object.keys(gates).length && resolved.every(Boolean);

  return res.status(200).json({
    pipeline_id,
    stage: deal.stage,
    gates,
    all_clear: allClear,
  });
}
