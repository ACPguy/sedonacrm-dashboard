import { createServerClient } from '../../../lib/supabaseServer';
import { getDriveClient } from '../../../lib/drive';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { folderId } = req.query;
  if (!folderId) return res.status(400).json({ error: 'Missing folderId' });

  try {
    const sb = createServerClient();

    const { data: account, error: acctErr } = await sb
      .from('email_accounts')
      .select('id')
      .eq('email', 'scott@andersoncp.com')
      .eq('is_active', true)
      .single();

    if (acctErr || !account) return res.status(400).json({ error: 'Gmail account not found' });

    const drive = await getDriveClient(account.id);

    const result = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size)',
      pageSize: 100,
    });

    return res.status(200).json({ files: result.data.files || [] });
  } catch (err) {
    console.error('[api/tasks/list-attachments]', err);
    return res.status(500).json({ error: err.message });
  }
}
