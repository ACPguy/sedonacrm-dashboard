import { google } from 'googleapis';
import { createServerClient } from './supabaseServer';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function getOAuth2Client(emailAccountId) {
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

  return oauth2;
}

export async function getDriveClient(emailAccountId) {
  const oauth2 = await getOAuth2Client(emailAccountId);
  return google.drive({ version: 'v3', auth: oauth2 });
}

export async function getOrCreateWorkHistoryFolder(drive, propertyFolderId) {
  const q = `'${propertyFolderId}' in parents and name = 'Work History' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: 'Work History',
      mimeType: 'application/vnd.google-apps.folder',
      parents: [propertyFolderId],
    },
    fields: 'id',
  });
  return created.data.id;
}

export async function createTaskFolder(drive, parentFolderId, folderName) {
  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });
  return created.data.id;
}
