export const config = { maxDuration: 60 };

import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient } from '../../../lib/gmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isManual) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const sb = createServerClient();

    const { data: account } = await sb
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!account) return res.status(400).json({ error: 'No active email account found' });

    const gmailClient = await getGmailClient(account.id);

    const { data: messages } = await sb
      .from('email_messages')
      .select('id, gmail_message_id')
      .or('body_stored.is.null,body_stored.eq.false')
      .order('received_at', { ascending: false })
      .limit(50);

    if (!messages?.length) return res.status(200).json({ updated: 0 });

    let updated = 0;
    for (const msg of messages) {
      try {
        const fullMsg = await gmailClient.users.messages.get({
          userId: 'me',
          id: msg.gmail_message_id,
          format: 'full',
        });
        const { html, text } = extractBody(fullMsg.data.payload);
        await sb
          .from('email_messages')
          .update({ body_html: html, body_text: text, body_stored: true })
          .eq('id', msg.id);
        updated++;
      } catch (err) {
        console.log(`[backfill-bodies] failed for ${msg.gmail_message_id}:`, err?.message);
      }
    }

    return res.status(200).json({ updated });
  } catch (err) {
    console.error('[backfill-bodies] error:', err);
    return res.status(500).json({ error: err.message });
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
