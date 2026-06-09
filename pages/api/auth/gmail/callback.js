// pages/api/auth/gmail/callback.js
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SCOTT_USER_ID = '573b65b5-ba16-437b-9101-d0bff2453dde';

async function sbFetch(table, row, useServiceKey = false) {
  const key = useServiceKey && SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert to ${table} failed: ${text}`);
  }
}

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/settings?gmail=error');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      return res.redirect('/settings?gmail=error');
    }

    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const profile = await profileRes.json();

    const expiryDate = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // Write to gmail_tokens (Stage 1 legacy — keep for backwards compat)
    await sbFetch('gmail_tokens', {
      user_id: SCOTT_USER_ID,
      email: profile.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: expiryDate.toISOString(),
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    });

    // Write to email_accounts (Stage 2 canonical token store)
    await sbFetch('email_accounts', {
      email: profile.email,
      display_name: profile.name || profile.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiryDate.toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    }, true);

    return res.redirect('/settings?gmail=connected');

  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect('/settings?gmail=error');
  }
}
