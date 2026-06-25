import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient, setupWatch } from '../../../lib/gmail';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const isCron = req.headers['x-vercel-cron'] === '1';
  const isManual = req.headers['x-briefing-secret'] === process.env.BRIEFING_SECRET;
  if (!isCron && !isManual) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const sb = createServerClient();

  try {
    const { data: account, error: accountErr } = await sb
      .from('email_accounts')
      .select('id, email')
      .eq('email', 'scott@andersoncp.com')
      .eq('is_active', true)
      .single();

    if (accountErr || !account) {
      return res.status(404).json({ ok: false, error: 'email_accounts row not found for scott@andersoncp.com' });
    }

    const gmailClient = await getGmailClient(account.id);
    await setupWatch(gmailClient, account.id);

    // Read back the saved expiration to confirm success and return it
    const { data: updated } = await sb
      .from('email_accounts')
      .select('pubsub_expiration, pubsub_history_id')
      .eq('id', account.id)
      .single();

    if (!updated?.pubsub_expiration) {
      return res.status(500).json({ ok: false, error: 'setupWatch completed but pubsub_expiration not saved — check GOOGLE_PUBSUB_TOPIC env var and Pub/Sub permissions' });
    }

    return res.status(200).json({
      ok: true,
      email: account.email,
      expiration: updated.pubsub_expiration,
      history_id: updated.pubsub_history_id,
    });

  } catch (err) {
    console.error('[gmail/renew-watch] error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
