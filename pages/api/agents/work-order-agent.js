export const config = { maxDuration: 60 };

import { createServerClient } from '../../../lib/supabaseServer';

// Arizona is UTC-7, no DST
function getAZDate() {
  const now = new Date();
  const azOffset = -7 * 60;
  const azTime = new Date(now.getTime() + (azOffset - now.getTimezoneOffset()) * 60000);
  return azTime.toISOString().slice(0, 10);
}

function daysDiff(dateStrA, dateStrB) {
  // Returns A - B in whole days (positive = A is later)
  return Math.round((new Date(dateStrA) - new Date(dateStrB)) / (1000 * 60 * 60 * 24));
}

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function displayId(task) {
  return task.prop_code ? `${task.prop_code}-${task.task_num}` : String(task.task_num);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const sb = createServerClient();
  const today = getAZDate();

  const isCron   = req.headers['x-vercel-cron'] === '1';
  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;

  // ── Plain GET (no cron header): return today's saved run ──────────────────
  if (req.method === 'GET' && !isCron) {
    const { data } = await sb
      .from('wo_agent_runs')
      .select('*')
      .eq('run_date', today)
      .maybeSingle();
    return res.status(200).json(data || { status: 'none' });
  }

  // ── Cron GET or manual POST — require auth ─────────────────────────────────
  if (!isCron && !isManual) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const OPEN_STATUSES = ['Open', 'In Progress', 'On Hold'];

    // Cutoff for "no activity" trigger: updated_at < 14 days ago
    const noActivityCutoff = new Date(today);
    noActivityCutoff.setDate(noActivityCutoff.getDate() - 14);
    const noActivityCutoffStr = noActivityCutoff.toISOString();

    // Query 1: WOs sent to a vendor, open, past due (for past_due triggers)
    const { data: pastDueWOs, error: pdErr } = await sb
      .from('tasks')
      .select('id,task_num,record_type,title,prop_code,priority,status,follow_up_date,vendor_id,email_request_sent,updated_at')
      .eq('record_type', 'work_order')
      .in('status', OPEN_STATUSES)
      .not('email_request_sent', 'is', null)
      .neq('email_request_sent', 'No')
      .not('follow_up_date', 'is', null)
      .lt('follow_up_date', today)
      .order('follow_up_date', { ascending: true })
      .limit(200);

    if (pdErr) throw pdErr;

    // Query 2: WOs sent to a vendor, open, no activity in 14 days (regardless of due date)
    const { data: staleWOs, error: staleErr } = await sb
      .from('tasks')
      .select('id,task_num,record_type,title,prop_code,priority,status,follow_up_date,vendor_id,email_request_sent,updated_at')
      .eq('record_type', 'work_order')
      .in('status', ['Open', 'In Progress'])
      .not('email_request_sent', 'is', null)
      .neq('email_request_sent', 'No')
      .lt('updated_at', noActivityCutoffStr)
      .order('updated_at', { ascending: true })
      .limit(200);

    if (staleErr) throw staleErr;

    // Query 3: High-cost WOs (open, estimate >= $2,500)
    const { data: highCostWOs, error: hcErr } = await sb
      .from('tasks')
      .select('id,task_num,record_type,title,prop_code,priority,status,estimate_amount,vendor_id')
      .eq('record_type', 'work_order')
      .in('status', OPEN_STATUSES)
      .not('estimate_amount', 'is', null)
      .gte('estimate_amount', 2500)
      .order('estimate_amount', { ascending: false })
      .limit(100);

    if (hcErr) throw hcErr;

    // ── Build nudge items ──────────────────────────────────────────────────
    const nudgeMap = new Map(); // keyed by task.id to deduplicate

    // Past-due triggers
    for (const task of (pastDueWOs || [])) {
      const daysOverdue = daysDiff(today, task.follow_up_date);
      const priority = task.priority || '';

      let qualifies = false;
      if (['Urgent'].includes(priority) && daysOverdue >= 2)  qualifies = true;
      if (['High'].includes(priority)   && daysOverdue >= 7)  qualifies = true;
      if (!['Urgent', 'High'].includes(priority) && daysOverdue >= 10) qualifies = true;

      if (!qualifies) continue;

      const id = displayId(task);
      nudgeMap.set(task.id, {
        type: 'nudge',
        task_num: task.task_num,
        title: task.title,
        prop_code: task.prop_code,
        priority: task.priority,
        vendor_id: task.vendor_id,
        follow_up_date: task.follow_up_date,
        days_overdue: daysOverdue,
        trigger: 'past_due',
        url: `/tasks/${task.task_num}`,
        label: `WO overdue ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}: ${id} — ${task.title}`,
        meta: [task.prop_code, task.follow_up_date ? `due ${task.follow_up_date}` : null, task.priority].filter(Boolean).join(' · '),
      });
    }

    // No-activity trigger (skip if already added via past_due)
    for (const task of (staleWOs || [])) {
      if (nudgeMap.has(task.id)) continue;
      const daysSinceUpdate = daysDiff(today, task.updated_at.slice(0, 10));
      const id = displayId(task);
      nudgeMap.set(task.id, {
        type: 'nudge',
        task_num: task.task_num,
        title: task.title,
        prop_code: task.prop_code,
        priority: task.priority,
        vendor_id: task.vendor_id,
        follow_up_date: task.follow_up_date || null,
        days_overdue: 0,
        trigger: 'no_activity',
        url: `/tasks/${task.task_num}`,
        label: `No activity ${daysSinceUpdate} days: ${id} — ${task.title}`,
        meta: [task.prop_code, `no update ${daysSinceUpdate}d`, task.priority].filter(Boolean).join(' · '),
      });
    }

    const nudge_items = Array.from(nudgeMap.values());

    // ── Build high-cost items ──────────────────────────────────────────────
    const high_cost_items = (highCostWOs || []).map(task => {
      const id = displayId(task);
      const amt = fmtMoney(task.estimate_amount);
      return {
        type: 'high_cost',
        task_num: task.task_num,
        title: task.title,
        prop_code: task.prop_code,
        estimate_amount: Number(task.estimate_amount),
        url: `/tasks/${task.task_num}`,
        label: `High cost WO: ${id} — ${task.title} (${amt})`,
        meta: [task.prop_code, amt].filter(Boolean).join(' · '),
      };
    });

    // ── Upsert to wo_agent_runs ────────────────────────────────────────────
    const { data: saved, error: saveErr } = await sb
      .from('wo_agent_runs')
      .upsert({
        run_date: today,
        status: 'complete',
        nudge_items,
        high_cost_items,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'run_date' })
      .select()
      .single();

    if (saveErr) throw saveErr;

    return res.status(200).json({ status: 'complete', nudge_items, high_cost_items, updated_at: saved.updated_at });

  } catch (err) {
    console.error('[work-order-agent]', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── MIGRATION SQL — RUN IN PSQL ────────────────────────────────────────────
//
// export DB='postgresql://postgres.edxcvyleielzevpappui:SedonaCRM2026@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
// psql $DB
//
// CREATE TABLE IF NOT EXISTS wo_agent_runs (
//   id             uuid         default gen_random_uuid() primary key,
//   run_date       date         not null unique,
//   status         text         not null default 'none',
//   nudge_items    jsonb        default '[]',
//   high_cost_items jsonb       default '[]',
//   updated_at     timestamptz  default now()
// );
// ALTER TABLE wo_agent_runs ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "anon_select" ON wo_agent_runs FOR SELECT TO anon USING (true);
