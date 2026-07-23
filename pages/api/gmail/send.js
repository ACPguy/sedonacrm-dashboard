import { createServerClient } from '../../../lib/supabaseServer';
import { getGmailClient } from '../../../lib/gmail';
import { getDriveClient } from '../../../lib/drive';

// Attachment support (RFP vendor email build, Part 3c): filenames come from
// Drive file names the account owner created, but are still sanitized before
// landing in a MIME header — strip CR/LF (header injection) and quotes.
const sanitizeFilename = name => String(name || 'attachment').replace(/[\r\n]/g, '').replace(/"/g, "'");

async function fetchDriveAttachmentBase64(drive, fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data).toString('base64');
}

// RFC 2045 caps base64 body lines at 76 chars
const wrapBase64 = b64 => b64.replace(/(.{76})/g, '$1\r\n');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    fromAccount, to, cc, bcc, subject, bodyHtml,
    inReplyToMessageId, gmailThreadId,
    crmRecordType, crmRecordId, crmRecordLabel, crmRecordUrl,
    attachments,
  } = req.body || {};

  if (!fromAccount || !Array.isArray(to) || to.length === 0 || !subject) {
    return res.status(400).json({ error: 'Missing required fields: fromAccount, to, subject' });
  }

  try {
    const sb = createServerClient();

    const { data: account, error: acctErr } = await sb
      .from('email_accounts')
      .select('*')
      .eq('email', fromAccount)
      .eq('is_active', true)
      .single();

    if (acctErr || !account) {
      return res.status(400).json({ error: 'Email account not found or inactive' });
    }

    const gmailClient = await getGmailClient(account.id);

    const fmtAddr = r => r.name ? `${r.name} <${r.email}>` : r.email;
    const toHeader  = to.map(fmtAddr).join(', ');
    const ccHeader  = (cc  || []).map(fmtAddr).join(', ');
    const bccHeader = (bcc || []).map(fmtAddr).join(', ');

    // Inject CRM footer server-side
    let fullBodyHtml = bodyHtml || '';
    if (crmRecordId && crmRecordUrl && crmRecordLabel) {
      fullBodyHtml += `<div style="margin-top:24px; padding-top:12px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af;">📎 SedonaCRM — <a href="${crmRecordUrl}" style="color:#E8630A;">${crmRecordLabel} →</a></div>`;
    }

    const lines = [
      `From: Scott Anderson <${fromAccount}>`,
      `To: ${toHeader}`,
    ];
    if (ccHeader)  lines.push(`Cc: ${ccHeader}`);
    if (bccHeader) lines.push(`Bcc: ${bccHeader}`);
    lines.push(`Subject: ${subject}`);
    if (inReplyToMessageId) {
      lines.push(`In-Reply-To: ${inReplyToMessageId}`);
      lines.push(`References: ${inReplyToMessageId}`);
    }
    if (crmRecordType && crmRecordId) {
      lines.push(`X-SedonaCRM-Record: ${crmRecordType}:${crmRecordId}`);
    }
    lines.push('MIME-Version: 1.0');

    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!hasAttachments) {
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push('');
      lines.push(fullBodyHtml);
    } else {
      const drive = await getDriveClient(account.id);
      const boundary = `----=_SedonaCRM_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/html; charset=UTF-8');
      lines.push('');
      lines.push(fullBodyHtml);
      lines.push('');

      for (const att of attachments) {
        const filename = sanitizeFilename(att.filename);
        const mimeType = att.mimeType || 'application/octet-stream';
        const base64Content = await fetchDriveAttachmentBase64(drive, att.driveFileId);

        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${mimeType}; name="${filename}"`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(`Content-Disposition: attachment; filename="${filename}"`);
        lines.push('');
        lines.push(wrapBase64(base64Content));
        lines.push('');
      }
      lines.push(`--${boundary}--`);
    }

    const raw = Buffer.from(lines.join('\r\n')).toString('base64url');
    const sendPayload = { userId: 'me', requestBody: { raw } };
    if (gmailThreadId) sendPayload.requestBody.threadId = gmailThreadId;

    const sentRes   = await gmailClient.users.messages.send(sendPayload);
    const gmailMsgId = sentRes.data.id;
    const gmailThdId = sentRes.data.threadId;

    const plainSnippet = fullBodyHtml.replace(/<[^>]+>/g, '').substring(0, 300);
    let threadRow;

    const { data: existingThread } = await sb
      .from('email_threads')
      .select('*')
      .eq('gmail_thread_id', gmailThdId)
      .single();

    if (existingThread) {
      const { data: updated } = await sb
        .from('email_threads')
        .update({ last_message_at: new Date().toISOString(), snippet: plainSnippet })
        .eq('id', existingThread.id)
        .select()
        .single();
      threadRow = updated;
    } else {
      const { data: created } = await sb
        .from('email_threads')
        .insert({
          gmail_thread_id:   gmailThdId,
          email_account_id:  account.id,
          subject,
          snippet:           plainSnippet,
          last_message_at:   new Date().toISOString(),
          linked_record_type: crmRecordType || null,
          linked_record_id:   crmRecordId   || null,
          link_status:       crmRecordId ? 'auto_linked' : 'unlinked',
          is_read:           true,
          unread_count:      0,
          gmail_labels:      ['SENT'],
        })
        .select()
        .single();
      threadRow = created;
    }

    if (!threadRow) return res.status(500).json({ error: 'Failed to upsert thread record' });

    const { data: msgRow } = await sb
      .from('email_messages')
      .insert({
        gmail_message_id:    gmailMsgId,
        thread_id:           threadRow.id,
        email_account_id:    account.id,
        from_address:        fromAccount,
        from_name:           'Scott Anderson',
        to_addresses:        to,
        cc_addresses:        cc || [],
        subject,
        snippet:             plainSnippet,
        body_html:           fullBodyHtml,
        body_stored:         true,
        crm_record_header:   crmRecordId ? `${crmRecordType}:${crmRecordId}` : null,
        is_outbound:         true,
        is_latest_in_thread: true,
        sent_at:             new Date().toISOString(),
      })
      .select()
      .single();

    if (msgRow) {
      await sb
        .from('email_messages')
        .update({ is_latest_in_thread: false })
        .eq('thread_id', threadRow.id)
        .neq('id', msgRow.id);
    }

    if (crmRecordType && crmRecordId && msgRow) {
      await sb.from('email_thread_links').upsert({
        thread_id:   threadRow.id,
        record_type: crmRecordType,
        record_id:   crmRecordId,
        link_type:   'primary',
      }, { onConflict: 'thread_id,record_type,record_id' });

      await sb.from('communication_timeline').insert({
        record_type:     crmRecordType,
        record_id:       crmRecordId,
        entry_type:      'email',
        email_message_id: msgRow.id,
        email_thread_id:  threadRow.id,
        subject,
        body_preview:    plainSnippet.substring(0, 500),
        direction:       'outbound',
        from_address:    fromAccount,
        from_name:       'Scott Anderson',
        entry_at:        new Date().toISOString(),
      });
    }

    return res.status(200).json({ success: true, messageId: gmailMsgId, threadId: gmailThdId });
  } catch (err) {
    console.error('[api/gmail/send]', err);
    return res.status(500).json({ error: err.message });
  }
}
