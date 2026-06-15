export const config = { maxDuration: 60 };

import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient } from '../../../lib/gmail';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    const sb = createServerClient();

    const { data: account, error: acctErr } = await sb
      .from('email_accounts')
      .select('*')
      .eq('email', 'scott@andersoncp.com')
      .eq('is_active', true)
      .single();

    if (!account) {
      return res.status(404).json({ error: 'Email account not found', detail: acctErr?.message });
    }

    const gmail = await getGmailClient(account.id);

    const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);
    const q = `after:${ninetyDaysAgo}`;

    let allThreadIds = [];
    let pageToken = null;

    do {
      const params = { userId: 'me', q, maxResults: 500 };
      if (pageToken) params.pageToken = pageToken;
      const listRes = await gmail.users.threads.list(params);
      const items = listRes.data.threads || [];
      allThreadIds.push(...items.map(t => t.id));
      pageToken = listRes.data.nextPageToken || null;
      if (allThreadIds.length >= 2000) break;
    } while (pageToken);

    allThreadIds = allThreadIds.slice(0, 2000);
    console.log(`[backfill] found ${allThreadIds.length} threads to process`);

    let threadsProcessed = 0;
    let messagesProcessed = 0;

    for (let i = 0; i < allThreadIds.length; i += 10) {
      const batch = allThreadIds.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(threadId => processThread(gmail, sb, account, threadId))
      );
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          threadsProcessed++;
          messagesProcessed += result.value.msgCount;
        } else if (result.status === 'rejected') {
          console.error('[backfill] thread error:', result.reason?.message || result.reason);
        }
      }
    }

    return res.status(200).json({ threadsProcessed, messagesProcessed });
  } catch (err) {
    console.error('[backfill] fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function processThread(gmail, sb, account, threadId) {
  const threadRes = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
  });

  const thread = threadRes.data;
  const messages = thread.messages || [];
  if (messages.length === 0) return { msgCount: 0 };

  const firstHeaders = parseHeaders(messages[0].payload?.headers || []);
  const subject = firstHeaders['subject'] || '(no subject)';

  const lastMsg = messages[messages.length - 1];
  const lastInternalDate = parseInt(lastMsg.internalDate || '0');
  const last_message_at = new Date(lastInternalDate).toISOString();
  const snippet = thread.snippet || lastMsg.snippet || '';

  const hasUnread = messages.some(m => (m.labelIds || []).includes('UNREAD'));
  const is_read = !hasUnread;

  const { data: threadRow, error: threadErr } = await sb
    .from('email_threads')
    .upsert({
      gmail_thread_id: threadId,
      email_account_id: account.id,
      subject,
      snippet,
      last_message_at,
      is_read,
      link_status: 'unlinked',
    }, { onConflict: 'gmail_thread_id' })
    .select()
    .single();

  if (threadErr || !threadRow) {
    console.error('[backfill] thread upsert error:', threadErr?.message);
    return { msgCount: 0 };
  }

  let msgCount = 0;
  for (const msg of messages) {
    const headers = parseHeaders(msg.payload?.headers || []);

    const fromRaw = headers['from'] || '';
    const fromMatch = fromRaw.match(/^(.*?)\s*<(.+)>$/) || [null, fromRaw, fromRaw];
    const from_name = fromMatch[1]?.trim() || '';
    const from_address = (fromMatch[2] || fromRaw).toLowerCase().trim();

    const is_outbound = from_address.includes('andersoncp.com');

    let sent_at = null;
    if (headers['date']) {
      const parsed = new Date(headers['date']);
      if (!isNaN(parsed.getTime())) sent_at = parsed.toISOString();
    }
    if (!sent_at && msg.internalDate) {
      sent_at = new Date(parseInt(msg.internalDate)).toISOString();
    }

    const to_addresses = parseAddressHeader(headers['to']);

    const { error: msgErr } = await sb
      .from('email_messages')
      .upsert({
        gmail_message_id: msg.id,
        thread_id: threadRow.id,
        email_account_id: account.id,
        from_address,
        from_name,
        to_addresses,
        subject: headers['subject'] || subject,
        snippet: msg.snippet || '',
        sent_at,
        is_outbound,
        body_stored: false,
      }, { onConflict: 'gmail_message_id', ignoreDuplicates: true });

    if (msgErr) {
      console.error('[backfill] message upsert error:', msgErr?.message);
    } else {
      msgCount++;
    }
  }

  return { msgCount };
}

function parseHeaders(headers) {
  const result = {};
  for (const h of headers) {
    result[h.name.toLowerCase()] = h.value;
  }
  return result;
}

function parseAddressHeader(raw) {
  if (!raw) return null;
  return raw.split(',').map(a => {
    const m = a.trim().match(/^(.*?)\s*<(.+)>$/) || [null, a.trim(), a.trim()];
    return { name: m[1]?.trim() || '', email: (m[2] || a).trim().toLowerCase() };
  });
}
