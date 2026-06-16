import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { threadId, recordType, recordId } = req.body || {};
  if (!threadId || !recordType || !recordId) {
    return res.status(400).json({ error: 'Missing required fields: threadId, recordType, recordId' });
  }

  try {
    const sb = createServerClient();

    const { error: updateErr } = await sb
      .from('email_threads')
      .update({
        linked_record_type: recordType,
        linked_record_id: recordId,
        link_status: 'manually_linked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    if (updateErr) {
      console.error('[link-thread] thread update error:', updateErr.message);
      return res.status(500).json({ error: updateErr.message });
    }

    try {
      await sb.from('email_thread_links').upsert({
        thread_id: threadId,
        record_type: recordType,
        record_id: recordId,
        is_primary: true,
        link_source: 'manual',
      }, { onConflict: 'thread_id,record_type,record_id' });
    } catch (linkErr) {
      console.log('[link-thread] email_thread_links skip:', linkErr?.message);
    }

    // Backfill communication_timeline for all messages in this thread.
    // communication_timeline has no unique constraint on (record_type, record_id, email_message_id)
    // so each message is plain-inserted; errors per message are caught and skipped individually.
    const { data: messages, error: msgsErr } = await sb
      .from('email_messages')
      .select('id, subject, snippet, is_outbound, from_address, from_name, sent_at, received_at')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true, nullsFirst: false });

    if (msgsErr) {
      console.error('[link-thread] messages fetch error:', msgsErr.message);
    } else if (messages?.length) {
      for (const msg of messages) {
        try {
          await sb.from('communication_timeline').insert({
            record_type:      recordType,
            record_id:        recordId,
            entry_type:       'email',
            email_message_id: msg.id,
            email_thread_id:  threadId,
            subject:          msg.subject,
            body_preview:     msg.snippet,
            direction:        msg.is_outbound ? 'outbound' : 'inbound',
            from_address:     msg.from_address,
            from_name:        msg.from_name,
            entry_at:         msg.sent_at || msg.received_at || new Date().toISOString(),
          });
        } catch (err) {
          console.log(`[link-thread] timeline skip for message ${msg.id}:`, err?.message);
        }
      }
      console.log(`[link-thread] wrote ${messages.length} timeline entries for thread ${threadId} → ${recordType}:${recordId}`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[link-thread] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
