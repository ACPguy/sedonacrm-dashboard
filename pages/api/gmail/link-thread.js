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

    // Fetch thread + latest message to build timeline entry
    const { data: thread } = await sb
      .from('email_threads')
      .select('subject, snippet, last_message_at')
      .eq('id', threadId)
      .single();

    const { data: latestMsg } = await sb
      .from('email_messages')
      .select('id, from_address, from_name, snippet, is_outbound, sent_at, received_at')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (thread) {
      const entryAt =
        latestMsg?.sent_at ||
        latestMsg?.received_at ||
        thread.last_message_at ||
        new Date().toISOString();

      const { error: ctErr } = await sb.from('communication_timeline').insert({
        record_type:      recordType,
        record_id:        recordId,
        entry_type:       'email',
        email_thread_id:  threadId,
        email_message_id: latestMsg?.id || null,
        subject:          thread.subject || '(no subject)',
        body_preview:     latestMsg?.snippet || thread.snippet || '',
        direction:        latestMsg?.is_outbound ? 'outbound' : 'inbound',
        from_address:     latestMsg?.from_address || null,
        from_name:        latestMsg?.from_name || null,
        entry_at:         entryAt,
      });

      if (ctErr) {
        console.error('[link-thread] communication_timeline insert error:', ctErr.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[link-thread] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
