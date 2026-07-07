import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient } from '../../../lib/gmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const sb = createServerClient();

    const { data: account, error: accErr } = await sb
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .single();

    if (accErr || !account) {
      return res.status(400).json({ error: 'No active email account found' });
    }

    const gmailClient = await getGmailClient(account.id);

    const startHistoryId = account.pubsub_history_id?.toString();
    if (!startHistoryId) {
      return res.status(200).json({ synced: 0, message: 'No history ID — nothing to sync' });
    }

    // Fetch history since last known historyId
    let historyRes;
    try {
      historyRes = await gmailClient.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
      });
    } catch (err) {
      // historyId too old — update to current and return
      const profileRes = await gmailClient.users.getProfile({ userId: 'me' });
      await sb.from('email_accounts')
        .update({ pubsub_history_id: parseInt(profileRes.data.historyId) })
        .eq('id', account.id);
      return res.status(200).json({ synced: 0, message: 'History expired — reset to current' });
    }

    const historyItems = historyRes.data.history || [];
    const newHistoryId = historyRes.data.historyId;

    let synced = 0;
    for (const item of historyItems) {
      for (const msg of (item.messagesAdded || [])) {
        const labelIds = msg.message.labelIds || [];
        if (labelIds.includes('SPAM') || labelIds.includes('TRASH')) continue;
        await processNewMessage(gmailClient, sb, account, msg.message.id);
        synced++;
      }
    }

    // Update history cursor
    if (newHistoryId) {
      await sb.from('email_accounts')
        .update({ pubsub_history_id: parseInt(newHistoryId) })
        .eq('id', account.id);
    }

    // Always poll inbox directly to catch any messages missed by history
    const listRes = await gmailClient.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 50,
    });
    for (const m of (listRes.data.messages || [])) {
      const { data: exists } = await sb
        .from('email_messages')
        .select('id')
        .eq('gmail_message_id', m.id)
        .maybeSingle();
      if (!exists) {
        await processNewMessage(gmailClient, sb, account, m.id);
        synced++;
      }
    }

    return res.status(200).json({ synced, message: `Synced ${synced} new message(s)` });

  } catch (err) {
    console.error('[sync-now] error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function processNewMessage(gmailClient, sb, account, gmailMessageId) {
  // Skip if already in DB
  const { data: existing } = await sb
    .from('email_messages')
    .select('id')
    .eq('gmail_message_id', gmailMessageId)
    .single();
  if (existing) return;

  const msgRes = await gmailClient.users.messages.get({
    userId: 'me',
    id: gmailMessageId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject', 'X-SedonaCRM-Record', 'Date'],
  });

  const msg = msgRes.data;
  const headers = {};
  for (const h of (msg.payload?.headers || [])) {
    headers[h.name.toLowerCase()] = h.value;
  }

  const fromRaw = headers['from'] || '';
  const fromMatch = fromRaw.match(/^(.*?)\s*<(.+)>$/) || [null, fromRaw, fromRaw];
  const fromName = fromMatch[1]?.trim() || '';
  const fromAddress = (fromMatch[2] || fromRaw).toLowerCase().trim();

  const crmHeader = headers['x-sedonacrm-record'] || null;
  const isOutbound = fromAddress === account.email.toLowerCase();

  let linkedRecordType = null;
  let linkedRecordId = null;
  let linkStatus = 'unlinked';

  if (crmHeader) {
    const [rtype, rid] = crmHeader.split(':');
    if (rtype && rid) {
      linkedRecordType = rtype;
      linkedRecordId = rid;
      linkStatus = 'auto_linked';
    }
  } else {
    const lookupEmail = isOutbound ? parseFirstEmail(headers['to']) : fromAddress;

    if (lookupEmail) {
      const { data: contact } = await sb
        .from('contacts')
        .select('id')
        .ilike('email', lookupEmail)
        .single();

      if (contact) {
        linkedRecordType = 'contact';
        linkedRecordId = contact.id;
        linkStatus = 'auto_linked';
      } else if (!isOutbound) {
        linkStatus = 'flagged';
      }
    }
  }

  const gmailThreadId = msg.threadId;
  let threadRow;

  const { data: existingThread } = await sb
    .from('email_threads')
    .select('*')
    .eq('gmail_thread_id', gmailThreadId)
    .single();

  if (existingThread) {
    const updates = {
      last_message_at: new Date(parseInt(msg.internalDate)).toISOString(),
      snippet: msg.snippet,
    };
    if (existingThread.link_status === 'unlinked' && linkStatus !== 'unlinked') {
      updates.linked_record_type = linkedRecordType;
      updates.linked_record_id = linkedRecordId;
      updates.link_status = linkStatus;
    }
    if (!isOutbound) updates.unread_count = (existingThread.unread_count || 0) + 1;
    const { data: updated } = await sb
      .from('email_threads').update(updates).eq('id', existingThread.id).select().single();
    threadRow = updated;
  } else {
    const { data: created } = await sb.from('email_threads').insert({
      gmail_thread_id: gmailThreadId,
      email_account_id: account.id,
      subject: headers['subject'] || '(no subject)',
      snippet: msg.snippet,
      last_message_at: new Date(parseInt(msg.internalDate)).toISOString(),
      linked_record_type: linkedRecordType,
      linked_record_id: linkedRecordId,
      link_status: linkStatus,
      is_read: isOutbound,
      unread_count: isOutbound ? 0 : 1,
      gmail_labels: msg.labelIds || [],
    }).select().single();
    threadRow = created;
  }

  if (!threadRow) return;

  let bodyHtml = null;
  let bodyText = null;
  let bodyStored = false;

  try {
    const fullMsg = await gmailClient.users.messages.get({
      userId: 'me',
      id: gmailMessageId,
      format: 'full',
    });
    const { html, text } = extractBody(fullMsg.data.payload);
    bodyHtml = html;
    bodyText = text;
    bodyStored = true;
  } catch (err) {
    console.log(`[sync-now] body fetch failed for ${gmailMessageId}:`, err?.message);
  }

  const { data: msgRow } = await sb.from('email_messages').insert({
    gmail_message_id: gmailMessageId,
    thread_id: threadRow.id,
    email_account_id: account.id,
    from_address: fromAddress,
    from_name: fromName,
    to_addresses: parseAddressHeader(headers['to']),
    cc_addresses: parseAddressHeader(headers['cc']),
    subject: headers['subject'] || '(no subject)',
    snippet: msg.snippet,
    body_html: bodyHtml,
    body_text: bodyText,
    body_stored: bodyStored,
    crm_record_header: crmHeader,
    is_outbound: isOutbound,
    is_latest_in_thread: true,
    sent_at: isOutbound ? new Date(parseInt(msg.internalDate)).toISOString() : null,
    received_at: !isOutbound ? new Date(parseInt(msg.internalDate)).toISOString() : null,
  }).select().single();

  if (msgRow) {
    await sb.from('email_messages')
      .update({ is_latest_in_thread: false })
      .eq('thread_id', threadRow.id)
      .neq('id', msgRow.id);
  }

  if (linkedRecordType && linkedRecordId && msgRow) {
    await sb.from('email_thread_links').upsert({
      thread_id: threadRow.id,
      record_type: linkedRecordType,
      record_id: linkedRecordId,
      link_type: 'primary',
    }, { onConflict: 'thread_id,record_type,record_id' });

    await sb.from('communication_timeline').insert({
      record_type: linkedRecordType,
      record_id: linkedRecordId,
      entry_type: 'email',
      email_message_id: msgRow.id,
      email_thread_id: threadRow.id,
      subject: headers['subject'] || '(no subject)',
      body_preview: (msg.snippet || '').substring(0, 500),
      direction: isOutbound ? 'outbound' : 'inbound',
      from_address: fromAddress,
      from_name: fromName,
      entry_at: new Date(parseInt(msg.internalDate)).toISOString(),
    });
  }
}

function extractBody(payload) {
  if (!payload) return { html: null, text: null };
  if (payload.mimeType === 'text/html') {
    return { html: Buffer.from(payload.body?.data || '', 'base64').toString(), text: null };
  }
  if (payload.mimeType === 'text/plain') {
    return { html: null, text: Buffer.from(payload.body?.data || '', 'base64').toString() };
  }
  if (payload.parts) {
    let html = null, text = null;
    for (const p of payload.parts) {
      const r = extractBody(p);
      if (r.html) html = r.html;
      if (r.text) text = r.text;
    }
    return { html, text };
  }
  return { html: null, text: null };
}

function parseAddressHeader(raw) {
  if (!raw) return null;
  return raw.split(',').map(a => {
    const m = a.trim().match(/^(.*?)\s*<(.+)>$/) || [null, a.trim(), a.trim()];
    return { name: m[1]?.trim() || '', email: (m[2] || a).trim().toLowerCase() };
  });
}

function parseFirstEmail(raw) {
  if (!raw) return '';
  const m = raw.trim().match(/<(.+)>/) || [null, raw.trim()];
  return (m[1] || '').toLowerCase();
}
