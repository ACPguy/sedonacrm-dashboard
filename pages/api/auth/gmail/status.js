// pages/api/auth/gmail/status.js
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SCOTT_USER_ID = '573b65b5-ba16-437b-9101-d0bff2453dde';

export default async function handler(req, res) {
  const params = new URLSearchParams({
    user_id: `eq.${SCOTT_USER_ID}`,
    select: 'email,token_expiry,updated_at',
  });

  const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?${params}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Accept': 'application/vnd.pgrst.object+json',
    },
  });

  if (!sbRes.ok || sbRes.status === 406) {
    return res.json({ connected: false });
  }

  const data = await sbRes.json();

  if (!data || !data.email) {
    return res.json({ connected: false });
  }

  return res.json({
    connected: true,
    email: data.email,
    tokenExpiry: data.token_expiry,
    lastUpdated: data.updated_at,
  });
}
