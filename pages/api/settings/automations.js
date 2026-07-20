import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createServerClient();

    const [{ data: agents, error: agentsErr }, { data: triggers, error: triggersErr }] = await Promise.all([
      supabase.from('automation_agents').select('*').order('name'),
      supabase.from('automation_triggers').select('*').order('module').order('name'),
    ]);

    if (agentsErr) throw new Error(agentsErr.message);
    if (triggersErr) throw new Error(triggersErr.message);

    return res.status(200).json({ agents, triggers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
