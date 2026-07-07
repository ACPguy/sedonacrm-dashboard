import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient } from '../../../lib/gmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isAuthorized = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isAuthorized) return res.status(401).json({ error: 'Unauthorized' });

  const { threadIds, action } = req.body || {};
  if (!Array.isArray(threadIds) || threadIds.length === 0) {
    return res.status(400).json({ error: 'Missing threadIds' });
  }
  if (!['archive', 'spam', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const sb = createServerClient();

  const results = await Promise.allSettled(
    threadIds.map(async (id) => {
      const { data: thread } = await sb
        .from('email_threads')
        .select('gmail_thread_id, email_account_id')
        .eq('id', id)
        .single();

      if (!thread) throw new Error(`Thread ${id} not found`);

      const gmailClient = await getGmailClient(thread.email_account_id);

      let labelMod, dbUpdate;
      if (action === 'archive') {
        labelMod = { removeLabelIds: ['INBOX'] };
        dbUpdate  = { is_archived: true };
      } else if (action === 'spam') {
        labelMod = { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] };
        dbUpdate  = { gmail_labels: ['SPAM'], is_read: true };
      } else {
        labelMod = { addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] };
        dbUpdate  = { is_deleted: true, gmail_labels: ['TRASH'] };
      }

      await gmailClient.users.threads.modify({
        userId: 'me',
        id: thread.gmail_thread_id,
        requestBody: labelMod,
      });

      await sb.from('email_threads').update(dbUpdate).eq('id', id);

      return id;
    })
  );

  const succeeded = [];
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') succeeded.push(threadIds[i]);
    else failed.push(threadIds[i]);
  });

  return res.status(200).json({ succeeded, failed });
}
