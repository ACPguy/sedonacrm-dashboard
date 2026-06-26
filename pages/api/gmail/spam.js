import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient } from '../../../lib/gmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isManual) return res.status(401).json({ error: 'Unauthorized' });

  const { threadId } = req.body || {};
  if (!threadId) return res.status(400).json({ error: 'Missing threadId' });

  try {
    const sb = createServerClient();

    const { data: thread } = await sb
      .from('email_threads')
      .select('gmail_thread_id, email_account_id')
      .eq('id', threadId)
      .single();

    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const gmailClient = await getGmailClient(thread.email_account_id);

    await gmailClient.users.threads.modify({
      userId: 'me',
      id: thread.gmail_thread_id,
      requestBody: { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] },
    });

    await sb
      .from('email_threads')
      .update({ gmail_labels: ['SPAM'], is_read: true })
      .eq('id', threadId);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/gmail/spam]', err);
    return res.status(500).json({ error: err.message });
  }
}
