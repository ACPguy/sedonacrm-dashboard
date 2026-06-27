import { createServerClient } from '../../../lib/supabaseServer';
import { getDriveClient, getOrCreateWorkHistoryFolder, createTaskFolder, createIndexPdf } from '../../../lib/drive';
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
      ? new Date(task.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    const folderName = `${datePart} — ${displayId}${titlePart}`;

    const newFolderId = await createTaskFolder(drive, workHistoryFolderId, folderName);
    const folderUrl = `https://drive.google.com/drive/folders/${newFolderId}`;

    await sb.from('tasks').update({
      drive_folder_id: newFolderId,
      drive_folder_url: folderUrl,
    }).eq('id', taskId);

    // Best-effort: create index PDF inside the folder (never blocks or fails the response)
    const propName = propCode || '';
    const recordUrl = `https://crm.andersoncp.com/tasks/${task.task_num}`;
    try {
      // Also fetch property_name if available
      let propertyName = '';
      const { data: prop } = await sb.from('properties').select('property_name').eq('prop_code', propCode).single().catch(() => ({ data: null }));
      if (prop?.property_name) propertyName = prop.property_name;

      const pdf = await createIndexPdf({
        taskNum:      task.task_num,
        propCode,
        title:        task.title,
        recordUrl,
        propertyName,
        createdAt:    task.created_at,
        folderId:     newFolderId,
        driveClient:  drive,
      });
      console.log(`[create-drive-folder] Index PDF created: ${pdf.fileName}`);

      await sb.from('tasks').update({ drive_index_pdf_id: pdf.id }).eq('id', taskId);
    } catch (pdfErr) {
      console.error('[create-drive-folder] PDF creation failed (non-fatal):', pdfErr.message);
    }

    return res.status(200).json({ folderId: newFolderId, folderUrl });
  } catch (err) {
    console.error('[api/tasks/create-drive-folder]', err);
    return res.status(500).json({ error: err.message });
  }
}
