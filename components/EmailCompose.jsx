import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import { X, Paperclip, Spinner } from '@phosphor-icons/react';
import { T } from '../lib/theme';

const SUPABASE_URL  = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const F = { xs:'12px', sm:'13px', base:'14px' };

const sbGet = async (table, params = '') => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` },
  });
  if (!r.ok) return null;
  const d = await r.json();
  return Array.isArray(d) ? d[0] : d;
};

// ── Tag Input (TO / CC / BCC) ──────────────────────────────────────────────────
const TagInput = ({ recipients, onChange, placeholder }) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const addRecipient = useCallback((str) => {
    const raw = str.trim();
    if (!raw) return;
    const m = raw.match(/^(.*?)\s*<(.+@.+)>$/) || [null, '', raw];
    const name  = m[1]?.trim() || '';
    const email = (m[2] || raw).trim().toLowerCase();
    if (!email.includes('@')) return;
    if (recipients.some(r => r.email === email)) { setInputVal(''); return; }
    onChange([...recipients, { name, email }]);
    setInputVal('');
  }, [recipients, onChange]);

  const handleKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      addRecipient(inputVal);
    }
    if (e.key === 'Backspace' && !inputVal && recipients.length > 0) {
      onChange(recipients.slice(0, -1));
    }
  };

  const handleBlur = () => { if (inputVal.trim()) addRecipient(inputVal); };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        display:'flex', flexWrap:'wrap', gap:'4px', alignItems:'center',
        minHeight:'32px', padding:'3px 6px',
        background:T.bg3, border:`0.5px solid ${T.border}`, borderRadius:'4px',
        cursor:'text',
      }}
    >
      {recipients.map((r, i) => (
        <span key={i} style={{
          display:'inline-flex', alignItems:'center', gap:'3px',
          padding:'2px 6px', borderRadius:'3px',
          background:T.bg2, border:`0.5px solid ${T.accent}`,
          fontSize:F.xs, color:T.text0, whiteSpace:'nowrap',
        }}>
          {r.name || r.email}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(recipients.filter((_, j) => j !== i)); }}
            style={{ background:'none', border:'none', color:T.text2, cursor:'pointer', padding:'0 1px', lineHeight:1, fontSize:'11px' }}
          >✕</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={recipients.length === 0 ? placeholder : ''}
        style={{
          flex:1, minWidth:'120px', background:'transparent', border:'none',
          outline:'none', color:T.text0, fontSize:F.sm, fontFamily:'inherit',
          padding:'2px 0',
        }}
      />
    </div>
  );
};

// ── Body Editor ────────────────────────────────────────────────────────────────
const ToolBtn = ({ title, active, onAct, children }) => (
  <button
    type="button"
    title={title}
    onMouseDown={e => { e.preventDefault(); onAct(); }}
    style={{
      background: active ? T.bg2 : 'transparent',
      border: `1px solid ${active ? T.accent : T.border}`,
      color: active ? T.accent : T.text1,
      borderRadius:'3px', padding:'2px 5px', cursor:'pointer',
      fontSize:F.sm, minWidth:'22px', lineHeight:'1.4', fontFamily:'inherit', flexShrink:0,
    }}
  >{children}</button>
);

const EmailBodyEditor = ({ initialContent, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
    ],
    content: initialContent || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      {/* Toolbar */}
      <div style={{
        display:'flex', gap:'3px', flexWrap:'wrap', padding:'6px 8px',
        borderBottom:`0.5px solid ${T.border}`, background:T.bg2, flexShrink:0,
      }}>
        <ToolBtn title="Bold"          active={editor.isActive('bold')}          onAct={() => editor.chain().focus().toggleBold().run()}>B</ToolBtn>
        <ToolBtn title="Italic"        active={editor.isActive('italic')}        onAct={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolBtn>
        <ToolBtn title="Underline"     active={editor.isActive('underline')}     onAct={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive('strike')}        onAct={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolBtn>
        <div style={{width:'1px', height:'18px', background:T.border, margin:'0 2px', flexShrink:0, alignSelf:'center'}}/>
        <ToolBtn title="Bullet list"   active={editor.isActive('bulletList')}    onAct={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolBtn>
        <ToolBtn title="Ordered list"  active={editor.isActive('orderedList')}   onAct={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolBtn>
        <div style={{width:'1px', height:'18px', background:T.border, margin:'0 2px', flexShrink:0, alignSelf:'center'}}/>
        <ToolBtn title="Link"          active={editor.isActive('link')}          onAct={() => {
          const url = window.prompt('URL:', editor.isActive('link') ? editor.getAttributes('link').href : '');
          if (url === null) return;
          if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}>🔗</ToolBtn>
        <ToolBtn title="Clear format"  active={false}                            onAct={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>✕ fmt</ToolBtn>
      </div>
      {/* Editor area */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', minHeight:'160px', maxHeight:'320px' }}>
        <style>{`
          .email-body-editor .ProseMirror { outline: none; min-height: 140px; color: ${T.text0}; font-size: ${F.base}; line-height: 1.6; }
          .email-body-editor .ProseMirror p { margin: 0 0 8px; }
          .email-body-editor .ProseMirror ul, .email-body-editor .ProseMirror ol { padding-left: 20px; margin: 4px 0; }
          .email-body-editor .ProseMirror a { color: ${T.accent}; }
          .email-body-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: ${T.text3}; pointer-events: none; height: 0; }
        `}</style>
        <div className="email-body-editor">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EmailCompose({
  mode = 'new',
  inReplyToMessageId,
  gmailThreadId,
  crmRecordType,
  crmRecordId,
  crmRecordLabel,
  crmRecordUrl,
  prefilledTo = [],
  defaultSubject = '',
  initialBody = '',
  fromAccount = 'scott@andersoncp.com',
  onSend,
  onClose,
}) {
  const [to,      setTo]      = useState(prefilledTo || []);
  const [cc,      setCc]      = useState([]);
  const [bcc,     setBcc]     = useState([]);
  const [subject, setSubject] = useState(defaultSubject || (mode === 'reply' && defaultSubject ? `Re: ${defaultSubject}` : defaultSubject));
  const [bodyHtml, setBodyHtml] = useState('');
  const [showCc,  setShowCc]  = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [files,   setFiles]   = useState([]);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');
  const dropRef = useRef(null);

  // Pre-fill TO from task contacts (Deliverable 3)
  useEffect(() => {
    if (prefilledTo && prefilledTo.length > 0) {
      setTo(prefilledTo);
      return;
    }
    if (crmRecordType !== 'task' || !crmRecordId) return;

    (async () => {
      try {
        const task = await sbGet('tasks', `id=eq.${crmRecordId}&select=vendor_id,tenant_id`);
        if (!task) return;
        const resolved = [];

        if (task.vendor_id) {
          const vendor = await sbGet('vendors', `id=eq.${task.vendor_id}&select=primary_contact_id`);
          if (vendor?.primary_contact_id) {
            const contact = await sbGet('contacts', `id=eq.${vendor.primary_contact_id}&select=email,first_name,last_name`);
            if (contact?.email) {
              resolved.push({ email: contact.email, name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') });
            }
          }
        }

        if (task.tenant_id) {
          const tenant = await sbGet('tenants', `id=eq.${task.tenant_id}&select=primary_contact_id`);
          if (tenant?.primary_contact_id) {
            const contact = await sbGet('contacts', `id=eq.${tenant.primary_contact_id}&select=email,first_name,last_name`);
            if (contact?.email) {
              const entry = { email: contact.email, name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') };
              if (!resolved.some(r => r.email === entry.email)) resolved.push(entry);
            }
          }
        }

        if (resolved.length > 0) setTo(resolved);
      } catch {
        // fail silently
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag-and-drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = e => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = e => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files || []);
      setFiles(f => [...f, ...dropped]);
    };
    el.addEventListener('dragover', prevent);
    el.addEventListener('drop', onDrop);
    return () => { el.removeEventListener('dragover', prevent); el.removeEventListener('drop', onDrop); };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    if (to.length === 0 || !subject.trim()) {
      setError('TO and Subject are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccount, to, cc, bcc, subject, bodyHtml,
          inReplyToMessageId: inReplyToMessageId || null,
          gmailThreadId:      gmailThreadId      || null,
          crmRecordType:      crmRecordType      || null,
          crmRecordId:        crmRecordId        || null,
          crmRecordLabel:     crmRecordLabel     || null,
          crmRecordUrl:       crmRecordUrl       || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      onSend?.(data);
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const fieldRow = (label, content) => (
    <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'6px 0', borderBottom:`0.5px solid ${T.border}` }}>
      <span style={{ fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'600', minWidth:'52px', paddingTop:'6px', flexShrink:0 }}>
        {label}
      </span>
      <div style={{ flex:1, minWidth:0 }}>{content}</div>
    </div>
  );

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
        zIndex:300, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'16px',
      }}
    >
      <div style={{
        background:T.bg1, border:`0.5px solid ${T.border}`, borderRadius:'8px',
        width:'100%', maxWidth:'680px', maxHeight:'90vh',
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 24px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 16px', borderBottom:`0.5px solid ${T.border}`,
          background:T.bg0, flexShrink:0,
        }}>
          <span style={{ fontSize:F.base, fontWeight:'600', color:T.text0 }}>
            {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : '✉ New Email'}
          </span>
          <button type="button" onClick={onClose}
            style={{ background:'transparent', border:'none', color:T.text2, cursor:'pointer', padding:'4px', borderRadius:'4px', display:'flex', alignItems:'center' }}
            onMouseEnter={e => e.currentTarget.style.color=T.text0}
            onMouseLeave={e => e.currentTarget.style.color=T.text2}>
            <X size={16} weight="bold"/>
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding:'0 16px', flexShrink:0, background:T.bg1 }}>
          {fieldRow('From', (
            <span style={{ fontSize:F.sm, color:T.text2, padding:'5px 0', display:'block' }}>{fromAccount}</span>
          ))}

          {fieldRow('To', (
            <div>
              <TagInput recipients={to} onChange={setTo} placeholder="recipient@example.com"/>
              {!showCc || !showBcc ? (
                <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                  {!showCc  && <button type="button" onClick={() => setShowCc(true)}  style={{ background:'none', border:'none', color:T.accent, fontSize:F.xs, cursor:'pointer', padding:0 }}>+ Cc</button>}
                  {!showBcc && <button type="button" onClick={() => setShowBcc(true)} style={{ background:'none', border:'none', color:T.accent, fontSize:F.xs, cursor:'pointer', padding:0 }}>+ Bcc</button>}
                </div>
              ) : null}
            </div>
          ))}

          {showCc  && fieldRow('Cc',  <TagInput recipients={cc}  onChange={setCc}  placeholder="cc@example.com"/>)}
          {showBcc && fieldRow('Bcc', <TagInput recipients={bcc} onChange={setBcc} placeholder="bcc@example.com"/>)}

          {fieldRow('Subject', (
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Subject"
              style={{
                width:'100%', background:'transparent', border:'none', outline:'none',
                color:T.text0, fontSize:F.sm, fontFamily:'inherit',
                padding:'5px 0', boxSizing:'border-box',
              }}
            />
          ))}
        </div>

        {/* Body editor */}
        <div style={{ flex:1, minHeight:0, borderTop:`0.5px solid ${T.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <EmailBodyEditor initialContent={initialBody} onChange={setBodyHtml}/>
        </div>

        {/* Attachments drop zone */}
        <div
          ref={dropRef}
          style={{
            margin:'0 16px', padding:'8px 12px',
            border:`1px dashed ${T.border}`, borderRadius:'4px',
            background:T.bg2, flexShrink:0,
          }}
        >
          {files.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', color:T.text3, fontSize:F.xs }}>
              <Paperclip size={14}/> Drop files to attach
            </div>
          ) : (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
              {files.map((f, i) => (
                <span key={i} style={{
                  display:'inline-flex', alignItems:'center', gap:'4px',
                  padding:'2px 8px', borderRadius:'3px',
                  background:T.bg3, border:`0.5px solid ${T.border}`,
                  fontSize:F.xs, color:T.text1,
                }}>
                  <Paperclip size={11}/> {f.name}
                  <button type="button"
                    onClick={() => setFiles(fl => fl.filter((_, j) => j !== i))}
                    style={{ background:'none', border:'none', color:T.text3, cursor:'pointer', padding:'0 1px', fontSize:'11px' }}>✕</button>
                </span>
              ))}
              <label style={{ display:'inline-flex', alignItems:'center', gap:'3px', padding:'2px 8px', borderRadius:'3px', background:'transparent', border:`0.5px dashed ${T.border}`, fontSize:F.xs, color:T.text3, cursor:'pointer' }}>
                + Add file
                <input type="file" multiple style={{ display:'none' }} onChange={e => setFiles(f => [...f, ...Array.from(e.target.files || [])])}/>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 16px', borderTop:`0.5px solid ${T.border}`,
          background:T.bg0, flexShrink:0, gap:'10px',
        }}>
          <div style={{ flex:1 }}>
            {crmRecordId && crmRecordLabel && (
              <span style={{ fontSize:F.xs, color:T.text2 }}>📎 Linking to: <span style={{ color:T.warn }}>{crmRecordLabel}</span></span>
            )}
            {error && <span style={{ fontSize:F.xs, color:T.danger }}>{error}</span>}
          </div>
          <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ padding:'6px 14px', borderRadius:'4px', fontSize:F.sm, cursor:'pointer', border:`0.5px solid ${T.border}`, background:'transparent', color:T.text1 }}
              onMouseEnter={e => e.currentTarget.style.color=T.text0}
              onMouseLeave={e => e.currentTarget.style.color=T.text1}>
              Cancel
            </button>
            <button type="button" onClick={handleSend} disabled={sending || to.length === 0 || !subject.trim()}
              style={{
                padding:'6px 18px', borderRadius:'4px', fontSize:F.sm, fontWeight:'600',
                cursor: sending || to.length === 0 || !subject.trim() ? 'not-allowed' : 'pointer',
                border:`0.5px solid ${T.accent}`, background:T.accent, color:'#fff',
                opacity: sending || to.length === 0 || !subject.trim() ? 0.55 : 1,
                display:'flex', alignItems:'center', gap:'6px',
              }}>
              {sending && <Spinner size={13} className="spin"/>}
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
