import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { threadId, updates } = req.body || {};
  if (!threadId || !updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Missing threadId or updates' });
  }

  try {
    const sb = createServerClient();
    const { error } = await sb
      .from('email_threads')
      .update(updates)
      .eq('id', threadId);

    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[api/gmail/thread-update]', err);
    return res.status(500).json({ error: err.message });
  }
}
