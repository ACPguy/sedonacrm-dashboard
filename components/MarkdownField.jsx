import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { T } from '../lib/theme';

const MDEditor  = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MDPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false });

const F = { xs:'12px', sm:'13px', base:'14px' };

export default function MarkdownField({ label, value, onSave }) {
  const [editing,     setEditing]     = useState(false);
  const [val,         setVal]         = useState(value || '');
  const [saved,       setSaved]       = useState(false);
  const [editorHeight,setEditorHeight]= useState(160);
  const wrapperRef = useRef(null);
  const previewRef = useRef(null);
  const timerRef   = useRef(null);
  const valueRef   = useRef(value);

  useEffect(() => { valueRef.current = value; setVal(value || ''); }, [value]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const doSave = async v => {
    if (v === (valueRef.current || '')) return;
    try {
      await onSave(v);
      setSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch { alert('Save failed'); }
  };

  const startEditing = () => {
    const h = previewRef.current?.offsetHeight || 0;
    setEditorHeight(Math.max(160, h + 52));
    setEditing(true);
  };

  useEffect(() => {
    if (!editing) return;
    const onDown = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setEditing(false);
        doSave(val);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  // val captured in closure; re-runs when val changes to stay current
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, val]);

  return (
    <div style={{ marginBottom:'10px' }}>
      <div style={{ fontSize:F.xs, color:T.text3, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:'4px', display:'flex', alignItems:'center', gap:'6px' }}>
        {label}
        {saved && <span style={{ color:T.success, fontSize:'11px', fontWeight:'500' }}>✓ Saved</span>}
      </div>
      <div ref={wrapperRef} data-color-mode="dark">
        {editing ? (
          <MDEditor
            value={val}
            onChange={v => setVal(v || '')}
            height={editorHeight}
            preview="edit"
          />
        ) : (
          <div
            ref={previewRef}
            onClick={startEditing}
            title="Click to edit"
            style={{ cursor:'text', padding:'4px 6px', borderRadius:'4px', border:'1px solid transparent', minHeight:'28px' }}
            onMouseEnter={e => e.currentTarget.style.border = `1px solid ${T.border}`}
            onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
          >
            {val ? (
              <MDPreview
                source={val}
                style={{ background:'transparent', color:T.text0, fontSize:F.sm, padding:0 }}
              />
            ) : (
              <span style={{ color:T.text3, fontStyle:'italic', fontSize:F.sm }}>click to edit</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
