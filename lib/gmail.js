import { google } from 'googleapis';
import { createServerClient } from './supabaseServer';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function getGmailClient(emailAccountId) {
  const sb = createServerClient();

  const { data: account, error } = await sb
    .from('email_accounts')
    .select('*')
    .eq('id', emailAccountId)
    .single();

  if (error || !account) throw new Error(`email_accounts row not found: ${emailAccountId}`);

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const tokenExpiresAt = new Date(account.token_expires_at).getTime();
  const needsRefresh = !tokenExpiresAt || tokenExpiresAt < Date.now() + FIVE_MINUTES_MS;

  if (needsRefresh && account.refresh_token) {
    oauth2.setCredentials({ refresh_token: account.refresh_token });
    const { credentials } = await oauth2.refreshAccessToken();
    const newExpiry = new Date(credentials.expiry_date || Date.now() + 3600 * 1000).toISOString();

    await sb.from('email_accounts').update({
      access_token: credentials.access_token,
      token_expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    }).eq('id', emailAccountId);

    oauth2.setCredentials(credentials);
  } else {
    oauth2.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expiry_date: tokenExpiresAt,
    });
  }

  return google.gmail({ version: 'v1', auth: oauth2 });
}

export async function setupWatch(gmailClient, emailAccountId) {
  const sb = createServerClient();

  try {
    const res = await gmailClient.users.watch({
      userId: 'me',
      requestBody: {
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
        labelIds: ['INBOX'],
      },
    });

    const { historyId, expiration } = res.data;
    await sb.from('email_accounts').update({
      pubsub_history_id: parseInt(historyId),
      pubsub_expiration: new Date(parseInt(expiration)).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', emailAccountId);

    console.log(`[gmail] watch setup OK for account ${emailAccountId}, historyId=${historyId}`);
  } catch (err) {
    console.error(`[gmail] watch setup failed for account ${emailAccountId}:`, err.message);
  }
}
