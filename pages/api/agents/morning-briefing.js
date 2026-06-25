export const config = { maxDuration: 60 };

import { createServerClient } from '../../../lib/supabaseServer';

// Arizona is UTC-7, no DST
function getAZDate() {
  const now = new Date();
  const azOffset = -7 * 60;
  const azTime = new Date(now.getTime() + (azOffset - now.getTimezoneOffset()) * 60000);
  return azTime.toISOString().slice(0, 10);
}

function taskUrl(task) {
  return `/tasks/${task.task_num}`;
}
function tenantUrl(tenant) {
  return `/tenants/${tenant.podio_id ?? 'X' + tenant.id.slice(-6)}`;
}
function contactUrl(contact) {
  return `/contacts/${contact.podio_id ?? 'X' + contact.id.slice(-6)}`;
}
function coiUrl(coi) {
  if (coi.tenants?.podio_id) return `/tenants/${coi.tenants.podio_id}`;
  return coi.tenant_id ? `/tenants/X${coi.tenant_id.slice(-6)}` : null;
}
function propertyInsuranceUrl(pi) {
  return `/properties/${pi.prop_code}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end();
  }

  const sb = createServerClient();
  const today = getAZDate();

  if (req.method === 'GET') {
    const { data } = await sb.from('briefings').select('*').eq('run_date', today).maybeSingle();
    if (!data) return res.status(200).json({ status: 'none' });
    return res.status(200).json(data);
  }

  // POST — auth check
  const isCron = req.headers['x-vercel-cron'] === '1';
  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Idempotency: if complete, return existing
  const { data: existing } = await sb.from('briefings').select('*').eq('run_date', today).maybeSingle();
  if (existing?.status === 'complete') return res.status(200).json(existing);

  // Mark as running
  await sb.from('briefings').upsert({
    run_date: today,
    status: 'running',
    triggered_by: isCron ? 'cron' : 'manual',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'run_date' });

  try {
    const todayDate = new Date(today);
    const in30 = new Date(todayDate); in30.setDate(in30.getDate() + 30);
    const in120 = new Date(todayDate); in120.setDate(in120.getDate() + 120);
    const in14 = new Date(todayDate); in14.setDate(in14.getDate() + 14);
    const in60 = new Date(todayDate); in60.setDate(in60.getDate() + 60);
    const in7 = new Date(todayDate); in7.setDate(in7.getDate() + 7);
    const yesterday = new Date(todayDate); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const in30Str = in30.toISOString().slice(0, 10);
    const in120Str = in120.toISOString().slice(0, 10);
    const in14Str = in14.toISOString().slice(0, 10);
    const in60Str = in60.toISOString().slice(0, 10);
    const in7Str = in7.toISOString().slice(0, 10);

    const [
      overdueTasksRes,
      urgentLeasesRes,
      urgentCoisRes,
      thisWeekTasksRes,
      attentionLeasesRes,
      propertyInsuranceRes,
      attentionCoisRes,
      rentDueSoonRes,
      newTasksRes,
      completedTasksRes,
      newContactsRes,
      totalTasksRes,
      totalTenantsRes,
      totalPropertiesRes,
    ] = await Promise.all([

      // URGENT: tasks overdue + open
      sb.from('tasks')
        .select('id,task_num,record_type,title,prop_code,status,priority,follow_up_date,podio_id')
        .in('status', ['Open', 'In Progress', 'On Hold'])
        .not('follow_up_date', 'is', null)
        .lt('follow_up_date', today)
        .order('follow_up_date', { ascending: true })
        .limit(50),

      // URGENT: leases expiring within 30 days
      sb.from('tenants')
        .select('id,tenant_dba,prop_code,lease_ends,podio_id')
        .eq('tenant_status', 'Active')
        .not('lease_ends', 'is', null)
        .gte('lease_ends', today)
        .lte('lease_ends', in30Str)
        .order('lease_ends', { ascending: true }),

      // URGENT: tenant COIs expiring within 14 days
      sb.from('tnt_cois')
        .select('id,tenant_id,prop_code,insured_company,insur_type,expiry_date,podio_id,tenants(tenant_dba,podio_id)')
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today)
        .lte('expiry_date', in14Str)
        .order('expiry_date', { ascending: true }),

      // ATTENTION: tasks due this week
      sb.from('tasks')
        .select('id,task_num,record_type,title,prop_code,status,priority,follow_up_date,podio_id')
        .in('status', ['Open', 'In Progress', 'On Hold'])
        .not('follow_up_date', 'is', null)
        .gte('follow_up_date', today)
        .lte('follow_up_date', in7Str)
        .order('follow_up_date', { ascending: true })
        .limit(50),

      // ATTENTION: leases expiring 31–120 days
      sb.from('tenants')
        .select('id,tenant_dba,prop_code,lease_ends,podio_id')
        .eq('tenant_status', 'Active')
        .not('lease_ends', 'is', null)
        .gt('lease_ends', in30Str)
        .lte('lease_ends', in120Str)
        .order('lease_ends', { ascending: true }),

      // ATTENTION: property insurance expiring 0–30 days
      sb.from('property_insurance')
        .select('id,prop_code,insurance_co,expiry_date,status,podio_id')
        .not('expiry_date', 'is', null)
        .gte('expiry_date', today)
        .lte('expiry_date', in30Str)
        .order('expiry_date', { ascending: true }),

      // ATTENTION: tenant COIs expiring 15–60 days
      sb.from('tnt_cois')
        .select('id,tenant_id,prop_code,insured_company,insur_type,expiry_date,podio_id,tenants(tenant_dba,podio_id)')
        .not('expiry_date', 'is', null)
        .gt('expiry_date', in14Str)
        .lte('expiry_date', in60Str)
        .order('expiry_date', { ascending: true }),

      // ATTENTION: active rent records (proxy for rent due — QBO not yet connected)
      sb.from('rent_schedule')
        .select('id,tenant_id,prop_code,suite_num,total,rent_ends,tenants(tenant_dba,podio_id)')
        .eq('rent_status', 'Active')
        .lte('rent_starts', today)
        .gte('rent_ends', today)
        .order('prop_code', { ascending: true })
        .limit(30),

      // FYI: tasks created yesterday
      sb.from('tasks')
        .select('id,task_num,record_type,title,prop_code,status,podio_id,created_at')
        .gte('created_at', yesterdayStr + 'T00:00:00Z')
        .lt('created_at', today + 'T00:00:00Z')
        .order('created_at', { ascending: false })
        .limit(20),

      // FYI: tasks completed yesterday
      sb.from('tasks')
        .select('id,task_num,record_type,title,prop_code,podio_id,updated_at')
        .eq('status', 'Closed')
        .gte('updated_at', yesterdayStr + 'T00:00:00Z')
        .lt('updated_at', today + 'T00:00:00Z')
        .order('updated_at', { ascending: false })
        .limit(20),

      // FYI: new contacts added yesterday
      sb.from('contacts')
        .select('id,full_name,category,company_dba,podio_id,created_at')
        .gte('created_at', yesterdayStr + 'T00:00:00Z')
        .lt('created_at', today + 'T00:00:00Z')
        .order('created_at', { ascending: false })
        .limit(20),

      // SNAPSHOT: total open tasks count
      sb.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['Open', 'In Progress', 'On Hold']),

      // SNAPSHOT: active tenant count
      sb.from('tenants').select('id', { count: 'exact', head: true }).eq('tenant_status', 'Active'),

      // SNAPSHOT: active property count
      sb.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const urgent = [
      ...(overdueTasksRes.data || []).map(t => ({
        type: 'task',
        label: `${t.record_type === 'work_order' ? 'WO' : 'Task'} overdue: ${t.title}`,
        url: taskUrl(t),
        meta: [t.prop_code, t.follow_up_date ? `due ${t.follow_up_date}` : null].filter(Boolean).join(' · '),
      })),
      ...(urgentLeasesRes.data || []).map(t => ({
        type: 'lease',
        label: `Lease expiring: ${t.tenant_dba} — ${t.prop_code}`,
        url: tenantUrl(t),
        meta: `expires ${t.lease_ends}`,
      })),
      ...(urgentCoisRes.data || []).map(c => ({
        type: 'coi',
        label: `COI expiring: ${c.insured_company || c.tenants?.tenant_dba || 'Unknown'} (${c.insur_type || 'Insurance'}) — ${c.prop_code}`,
        url: coiUrl(c),
        meta: `expires ${c.expiry_date}`,
      })),
    ];

    const attention = [
      ...(thisWeekTasksRes.data || []).map(t => ({
        type: 'task',
        label: `${t.record_type === 'work_order' ? 'WO' : 'Task'} due this week: ${t.title}`,
        url: taskUrl(t),
        meta: [t.prop_code, t.follow_up_date ? `due ${t.follow_up_date}` : null].filter(Boolean).join(' · '),
      })),
      ...(attentionLeasesRes.data || []).map(t => ({
        type: 'lease',
        label: `Lease expiring soon: ${t.tenant_dba} — ${t.prop_code}`,
        url: tenantUrl(t),
        meta: `expires ${t.lease_ends}`,
      })),
      ...(propertyInsuranceRes.data || []).map(pi => ({
        type: 'property_insurance',
        label: `Property insurance expiring: ${pi.prop_code} — ${pi.insurance_co || 'Unknown insurer'}`,
        url: propertyInsuranceUrl(pi),
        meta: `expires ${pi.expiry_date}`,
      })),
      ...(attentionCoisRes.data || []).map(c => ({
        type: 'coi',
        label: `COI expiring: ${c.insured_company || c.tenants?.tenant_dba || 'Unknown'} (${c.insur_type || 'Insurance'}) — ${c.prop_code}`,
        url: coiUrl(c),
        meta: `expires ${c.expiry_date}`,
      })),
    ];

    const fyi = [
      ...(newTasksRes.data || []).map(t => ({
        type: 'task',
        label: `New ${t.record_type === 'work_order' ? 'WO' : 'task'}: ${t.title}`,
        url: taskUrl(t),
        meta: t.prop_code || null,
      })),
      ...(completedTasksRes.data || []).map(t => ({
        type: 'task',
        label: `Completed yesterday: ${t.title}`,
        url: taskUrl(t),
        meta: t.prop_code || null,
      })),
      ...(newContactsRes.data || []).map(c => ({
        type: 'contact',
        label: `New contact: ${c.full_name}${c.company_dba ? ' — ' + c.company_dba : ''}`,
        url: contactUrl(c),
        meta: c.category || null,
      })),
    ];

    const snapshot = {
      openTasksCount: totalTasksRes.count ?? 0,
      activeTenantsCount: totalTenantsRes.count ?? 0,
      activePropertiesCount: totalPropertiesRes.count ?? 0,
      urgentCount: urgent.length,
      attentionCount: attention.length,
      fyiCount: fyi.length,
    };

    const { data: saved, error: saveErr } = await sb
      .from('briefings')
      .upsert({
        run_date: today,
        status: 'complete',
        triggered_by: isCron ? 'cron' : 'manual',
        urgent,
        attention,
        fyi,
        snapshot,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'run_date' })
      .select()
      .single();

    if (saveErr) throw saveErr;
    return res.status(200).json(saved);

  } catch (err) {
    console.error('[morning-briefing] error:', err);
    try {
      await sb.from('briefings').upsert({
        run_date: today,
        status: 'error',
        triggered_by: isCron ? 'cron' : 'manual',
        error_message: err.message,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'run_date' });
    } catch {}
    return res.status(500).json({ error: err.message });
  }
}
