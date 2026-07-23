import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { record_type, title, ...rest } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!record_type) return res.status(400).json({ error: 'record_type is required' });

  const supabase = createServerClient();

  const insert = { record_type, title: title.trim(), status: rest.status || 'Open', priority: rest.priority || '???' };
  // Include any other non-null, non-empty fields from the body (but never task_num — trigger assigns it)
  const SKIP = new Set(['status', 'priority', 'task_num', 'id', 'created_at', 'updated_at']);
  for (const [k, v] of Object.entries(rest)) {
    if (!SKIP.has(k) && v != null && v !== '') insert[k] = v;
  }

  // First-save-only fallback: if a Contact was picked but Company was left
  // blank, derive Company from the Contact's own vendor_id/tenant_id. Fires
  // exactly once, here, at creation — never on any update/PATCH path (those
  // go through sbPatch directly from the client, never through this route).
  // Never overrides a manually-picked Company.
  if (!insert.vendor_id && insert.vendor_contact_id) {
    const { data: c } = await supabase.from('contacts').select('vendor_id').eq('id', insert.vendor_contact_id).single();
    if (c?.vendor_id) insert.vendor_id = c.vendor_id;
  }
  if (!insert.tenant_id && insert.tenant_contact_id) {
    const { data: c } = await supabase.from('contacts').select('tenant_id').eq('id', insert.tenant_contact_id).single();
    if (c?.tenant_id) insert.tenant_id = c.tenant_id;
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select('id, task_num')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Fire-and-forget Drive folder creation (never blocks response)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.andersoncp.com';
  fetch(`${baseUrl}/api/tasks/create-drive-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId: data.id }),
  }).catch(err => console.error('[create] drive folder fire-and-forget failed:', err.message));

  return res.status(200).json({ id: data.id, task_num: data.task_num });
}
