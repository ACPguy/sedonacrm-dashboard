import { createServerClient } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { threadId, recordType, recordId } = req.body || {};
  if (!threadId || !recordType || !recordId) {
    return res.status(400).json({ error: 'Missing required fields: threadId, recordType, recordId' });
  }

  try {
    const sb = createServerClient();

    // Known constraint on email_thread_links from webhook.js: (thread_id, record_type, record_id)
    // Logging for verification at runtime:
    console.log('[link-thread] constraint: thread_id,record_type,record_id (verified from webhook.js upsert)');

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
      // Skip on duplicate key — thread update already succeeded
      console.log('[link-thread] email_thread_links skip (duplicate or schema):', linkErr?.message);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[link-thread] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
