import { createServerClient } from '../../../lib/supabaseServer';
import { getDriveClient, getOrCreateWorkHistoryFolder, createTaskFolder } from '../../../lib/drive';
import { PROPERTY_DRIVE_FOLDERS } from '../../../lib/drivePropertyFolders';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { taskId } = req.body || {};
  if (!taskId) return res.status(400).json({ error: 'Missing taskId' });

  try {
    const sb = createServerClient();

    const { data: task, error: taskErr } = await sb
      .from('tasks')
      .select('id, record_type, task_num, prop_code, title, created_at, drive_folder_id')
      .eq('id', taskId)
      .single();

    if (taskErr || !task) return res.status(404).json({ error: 'Task not found' });
    if (task.record_type !== 'work_order') return res.status(400).json({ error: 'Task is not a work_order' });
    if (task.drive_folder_id) {
      const url = `https://drive.google.com/drive/folders/${task.drive_folder_id}`;
      return res.status(200).json({ folderId: task.drive_folder_id, folderUrl: url, alreadyExisted: true });
    }

    const propCode = task.prop_code;
    const propertyFolderId = propCode ? PROPERTY_DRIVE_FOLDERS[propCode] : null;
    if (!propertyFolderId) {
      return res.status(400).json({ error: `No Drive root folder configured for prop_code: ${propCode}` });
    }

    const { data: account, error: acctErr } = await sb
      .from('email_accounts')
      .select('id')
      .eq('email', 'scott@andersoncp.com')
      .eq('is_active', true)
      .single();

    if (acctErr || !account) return res.status(400).json({ error: 'Gmail account not found' });

    const drive = await getDriveClient(account.id);

    const workHistoryFolderId = await getOrCreateWorkHistoryFolder(drive, propertyFolderId);

    const displayId = propCode ? `${propCode}-${task.task_num}` : String(task.task_num);
    const titlePart = task.title ? ` — ${task.title.substring(0, 50)}` : '';
    const datePart = task.created_at
      ? ` — ${new Date(task.created_at).toISOString().split('T')[0]}`
      : ` — ${new Date().toISOString().split('T')[0]}`;
    const folderName = `${displayId}${titlePart}${datePart}`;

    const newFolderId = await createTaskFolder(drive, workHistoryFolderId, folderName);
    const folderUrl = `https://drive.google.com/drive/folders/${newFolderId}`;

    await sb.from('tasks').update({
      drive_folder_id: newFolderId,
      drive_folder_url: folderUrl,
    }).eq('id', taskId);

    return res.status(200).json({ folderId: newFolderId, folderUrl });
  } catch (err) {
    console.error('[api/tasks/create-drive-folder]', err);
    return res.status(500).json({ error: err.message });
  }
}
