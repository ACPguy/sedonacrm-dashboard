// rfpEmailTemplate.js — RFP vendor email HTML generator
//
// Table-based layout, inline styles only (email client safety). Modeled
// exactly on the approved preview (rfp-email-preview.html) provided by
// Scott, with the preview's placeholder inline-SVG logo swapped for the
// real committed asset at public/branding/acp-logo.png.
//
// buildRfpEmailHtml(task, property, vendorContact, keySafe, attachmentList)
//
// Expected shapes (all fields optional except where noted — every section
// degrades gracefully rather than throwing):
//   task           — a `tasks` row. Needs: title, task_num, prop_code,
//                     details (TipTap HTML), key_safe_id, tenant_contact_id.
//                     For the Tenant section, the caller must additionally
//                     attach the resolved tenant contact as
//                     `task.tenantContact = { full_name, primary_phone }`
//                     (fetched the same way vendorContact is resolved) —
//                     tasks.tenant_contact_id is only the FK, not a name/phone.
//   property       — a `properties` row. Needs: property_name, address,
//                     city, state, zip.
//   vendorContact  — a `contacts` row (the WO's Vendor Contact). Needs:
//                     full_name, title, company_dba, primary_phone, category.
//   keySafe        — a `key_safes` row (the WO's linked key safe), or null.
//                     Needs: key_safe_code, on_site_location.
//   attachmentList — array of { name } (Drive file list shape from
//                     /api/tasks/list-attachments), or [] / undefined.

import { getTaskPrefix } from '../utils/taskPrefix';

const PUBLIC_URL = 'https://crm.andersoncp.com';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'heic'];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// TipTap (RichTextEditor) output only — internal editor content, not
// arbitrary external HTML. This strips script/style/embed-style tags and
// inline event handlers/javascript: URLs as defense-in-depth before it goes
// into an email, without pulling in a full sanitizer dependency.
function sanitizeRichTextHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src)(\s*=\s*)("|')\s*javascript:[^"']*\3/gi, '$1$2$3#$3');
}

function fileIcon(filename) {
  const ext = String(filename || '').split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext) ? '🖼️' : '📄';
}

export function buildRfpEmailHtml(task, property, vendorContact, keySafe, attachmentList = []) {
  const t = task || {};
  const p = property || {};
  const vc = vendorContact || {};

  const woNum = getTaskPrefix(t);
  const woTitle = escapeHtml(t.title || '');

  const vendorNameLine = [vc.full_name, [vc.title, vc.company_dba].filter(Boolean).join(', ')]
    .filter(Boolean)
    .map(escapeHtml);
  const vendorMetaLine = [vc.primary_phone, vc.category].filter(Boolean).map(escapeHtml).join(' &middot; ');

  const scopeHtml = sanitizeRichTextHtml(t.details);

  const addressLine = [p.address, [p.city, p.state].filter(Boolean).join(', '), p.zip]
    .filter(Boolean)
    .join(', ');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [p.address, p.city, p.state, p.zip].filter(Boolean).join(' ')
  )}`;

  const tenantContact = t.tenantContact || null;
  const showTenant = !!(t.tenant_contact_id && tenantContact && (tenantContact.full_name || tenantContact.primary_phone));

  const showKeySafe = !!(t.key_safe_id && keySafe);

  const attachments = Array.isArray(attachmentList) ? attachmentList.filter(a => a && a.name) : [];
  const showAttachments = attachments.length > 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Request for Proposal — ${woNum}</title>
</head>
<body style="margin:0;padding:0;background:#EDEBE6;">

<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:10px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="background:#1C1A17;padding:28px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${PUBLIC_URL}/branding/acp-logo.png" width="180" height="73" alt="Anderson Commercial Properties" style="display:block;border:0;max-width:180px;height:auto;">
          </td>
          <td align="right" style="vertical-align:middle;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr><td style="background:#E8630A;border-radius:5px;padding:6px 12px;">
                <span style="font-family:-apple-system,sans-serif;font-size:12px;font-weight:700;color:#FFFFFF;letter-spacing:0.02em;">${escapeHtml(woNum)}</span>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Title -->
  <tr>
    <td style="padding:28px 32px 8px;">
      <span style="font-family:-apple-system,sans-serif;font-size:11px;font-weight:700;color:#E8630A;text-transform:uppercase;letter-spacing:0.1em;">Request for Proposal</span>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:#1C1A17;margin-top:6px;line-height:1.3;">
        ${woTitle}
      </div>
    </td>
  </tr>

  <!-- Reply-to notice -->
  <tr>
    <td style="padding:12px 32px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF4EC;border-left:3px solid #E8630A;border-radius:0 6px 6px 0;">
        <tr><td style="padding:12px 16px;">
          <span style="font-family:-apple-system,sans-serif;font-size:13px;color:#7A3A0A;line-height:1.5;">
            <strong>Please reply directly to this email</strong> for all estimates, invoices, photos, and updates on this project. Messages sent elsewhere won't reach this file.
          </span>
        </td></tr>
      </table>
    </td>
  </tr>

  ${vendorNameLine.length || vendorMetaLine ? `
  <!-- Vendor -->
  <tr>
    <td style="padding:24px 32px 0;">
      <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;color:#8A8478;text-transform:uppercase;letter-spacing:0.1em;">Sent to &middot; auto-filled from Vendor Contact, editable before send</span>
      <div style="font-family:-apple-system,sans-serif;font-size:15px;color:#1C1A17;margin-top:4px;">
        ${vendorNameLine[0] ? `<strong>${vendorNameLine[0]}</strong>` : ''}${vendorNameLine[1] ? ` &middot; ${vendorNameLine[1]}` : ''}${vendorNameLine.length ? '<br>' : ''}
        ${vendorMetaLine ? `<span style="color:#5A554A;">${vendorMetaLine}</span>` : ''}
      </div>
    </td>
  </tr>` : ''}

  ${scopeHtml ? `
  <!-- Description -->
  <tr>
    <td style="padding:24px 32px 0;">
      <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;color:#8A8478;text-transform:uppercase;letter-spacing:0.1em;">Scope of work</span>
      <div style="font-family:-apple-system,sans-serif;font-size:14px;color:#332F28;line-height:1.65;margin-top:8px;">
        ${scopeHtml}
      </div>
    </td>
  </tr>` : ''}

  ${p.property_name || addressLine ? `
  <!-- Property + map -->
  <tr>
    <td style="padding:28px 32px 0;">
      <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;color:#8A8478;text-transform:uppercase;letter-spacing:0.1em;">Property</span>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:#F7F5F1;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="padding:16px;">
            <div style="font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;color:#1C1A17;">${escapeHtml(p.property_name || '')}</div>
            <div style="font-family:-apple-system,sans-serif;font-size:13px;color:#5A554A;margin-top:2px;">${escapeHtml(addressLine)}</div>
            <a href="${mapsHref}" style="display:inline-block;margin-top:10px;font-family:-apple-system,sans-serif;font-size:12px;color:#E8630A;text-decoration:none;font-weight:600;border:1px solid #E8630A;border-radius:5px;padding:6px 12px;">
              📍 Open in Google Maps
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>` : ''}

  ${showTenant ? `
  <!-- Tenant -->
  <tr>
    <td style="padding:20px 32px 0;">
      <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;color:#8A8478;text-transform:uppercase;letter-spacing:0.1em;">Tenant contact</span>
      <div style="font-family:-apple-system,sans-serif;font-size:14px;color:#1C1A17;margin-top:4px;">
        <strong>${escapeHtml(tenantContact.full_name || '')}</strong>${tenantContact.primary_phone ? ` &middot; ${escapeHtml(tenantContact.primary_phone)}` : ''}
      </div>
    </td>
  </tr>` : ''}

  ${showKeySafe ? `
  <!-- Key safe -->
  <tr>
    <td style="padding:20px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1C1A17;border-radius:8px;">
        <tr><td style="padding:16px;">
          <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;color:#E8630A;text-transform:uppercase;letter-spacing:0.1em;">🔑 Site access</span>
          <div style="font-family:-apple-system,sans-serif;font-size:14px;color:#FFFFFF;margin-top:6px;">
            ${escapeHtml(keySafe.on_site_location || 'Key safe')}${keySafe.key_safe_code ? ` &middot; Code <strong>${escapeHtml(keySafe.key_safe_code)}</strong>` : ''}
          </div>
          <div style="font-family:-apple-system,sans-serif;font-size:12px;color:#B8B2A4;margin-top:6px;line-height:1.5;">
            Please scramble the code and close the box after use, and return keys to the box when finished — others rely on it staying in place.
          </div>
        </td></tr>
      </table>
    </td>
  </tr>` : ''}

  ${showAttachments ? `
  <!-- Attachments -->
  <tr>
    <td style="padding:20px 32px 0;">
      <span style="font-family:-apple-system,sans-serif;font-size:10px;font-weight:700;color:#8A8478;text-transform:uppercase;letter-spacing:0.1em;">Attached</span>
      <div style="margin-top:8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          ${attachments.map((a, i) => `
          <tr><td style="padding:8px 12px;background:#F7F5F1;border-radius:6px;font-family:-apple-system,sans-serif;font-size:13px;color:#332F28;">${fileIcon(a.name)} ${escapeHtml(a.name)}</td></tr>
          ${i < attachments.length - 1 ? '<tr><td style="height:6px;"></td></tr>' : ''}`).join('')}
        </table>
      </div>
    </td>
  </tr>` : ''}

  <!-- Footer -->
  <tr>
    <td style="padding:32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EDEBE6;">
        <tr><td style="padding-top:20px;">
          <div style="font-family:-apple-system,sans-serif;font-size:12px;color:#8A8478;line-height:1.6;">
            Anderson Commercial Properties &middot; Sedona, AZ<br>
            Reference <strong>${escapeHtml(woNum)}</strong> on all estimates, invoices, and photos.
          </div>
        </td></tr>
      </table>
    </td>
  </tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->

</body>
</html>
`;
}
