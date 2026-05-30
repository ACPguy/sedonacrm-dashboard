// pages/api/auth/gmail/callback.js
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SCOTT_USER_ID = '573b65b5-ba16-437b-9101-d0bff2453dde';

async function sbUpsertToken(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed: ${text}`);
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

    await sbUpsertToken({
      user_id: SCOTT_USER_ID,
      email: profile.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: expiryDate.toISOString(),
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    });

    return res.redirect('/settings?gmail=connected');

  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect('/settings?gmail=error');
  }
}
