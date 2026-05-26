import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240', success:'#6ab06a',
};
const F = { xs:'12px', sm:'13px', base:'14px' };

const Btn = ({ onAction, title, active, children }) => (
  <button
    onMouseDown={e => { e.preventDefault(); onAction(); }}
    title={title}
    style={{
      background: active ? T.bg2 : 'transparent',
      border: `1px solid ${active ? T.accent : T.border}`,
      color: active ? T.accent : T.text1,
      borderRadius: '3px', padding: '2px 5px', cursor: 'pointer',
      fontSize: F.sm, minWidth: '22px', lineHeight: '1.4', fontFamily: 'inherit',
      flexShrink: 0,
    }}
  >
    {children}
  </button>
);

const Sep = () => (
  <div style={{ width: '1px', height: '18px', background: T.border, margin: '0 2px', flexShrink: 0 }}/>
);

export default function RichTextEditor({ label, value, onSave, minRows = 5 }) {
  const [editing, setEditing] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [tick,    setTick]    = useState(0);   // force toolbar re-render on editor state change

  const wrapperRef  = useRef(null);
  const valueRef    = useRef(value);
  const onSaveRef   = useRef(onSave);
  const timerRef    = useRef(null);
  const editingRef  = useRef(false);

  useEffect(() => { onSaveRef.current = onSave; },  [onSave]);
  useEffect(() => { valueRef.current  = value; },   [value]);
  useEffect(() => { editingRef.current = editing; }, [editing]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || '',
    editable: false,
    onUpdate:          () => setTick(t => t + 1),
    onSelectionUpdate: () => setTick(t => t + 1),
  });

  // Sync external value changes when not editing
  useEffect(() => {
    if (!editor || editingRef.current) return;
    editor.commands.setContent(value || '', false);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSave = useCallback(async (html) => {
    const cleaned = (!html || html === '<p></p>') ? '' : html;
    if (cleaned === (valueRef.current || '')) return;
    try {
      await onSaveRef.current(cleaned);
      valueRef.current = cleaned;
      setSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch { alert('Save failed'); }
  }, []);

  const startEditing = useCallback(() => {
    if (!editor) return;
    editor.setEditable(true);
    setEditing(true);
    setTimeout(() => editor.commands.focus('end'), 10);
  }, [editor]);

  // Use a ref so the mousedown closure captures the latest stopEditing
  const stopEditing = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    editor.setEditable(false);
    setEditing(false);
    doSave(html);
  }, [editor, doSave]);

  const stopEditingRef = useRef(stopEditing);
  useEffect(() => { stopEditingRef.current = stopEditing; }, [stopEditing]);

  useEffect(() => {
    if (!editing) return;
    const onDown = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        stopEditingRef.current();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [editing]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
  }, [editor]);

  const isEmpty = !value || value === '<p></p>';

  return (
    <div style={{ marginBottom: '10px' }}>
      {label && (
        <div style={{
          fontSize: F.xs, color: T.text3, textTransform: 'uppercase',
          letterSpacing: '0.04em', marginBottom: '4px',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {label}
          {saved && <span style={{ color: T.success, fontSize: '11px', fontWeight: '500' }}>✓ Saved</span>}
        </div>
      )}

      <div
        ref={wrapperRef}
        style={{
          border: `1px solid ${editing ? T.accent : 'transparent'}`,
          borderRadius: '4px',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => { if (!editing) e.currentTarget.style.borderColor = T.border; }}
        onMouseLeave={e => { if (!editing) e.currentTarget.style.borderColor = 'transparent'; }}
      >
        {/* Toolbar — only visible when editing */}
        {editing && editor && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap',
            padding: '5px 6px', borderBottom: `1px solid ${T.border}`,
            background: T.bg0, borderRadius: '4px 4px 0 0',
          }}>
            {/* Undo / Redo */}
            <Btn onAction={() => editor.chain().focus().undo().run()} title="Undo">↩</Btn>
            <Btn onAction={() => editor.chain().focus().redo().run()} title="Redo">↪</Btn>
            <Sep/>

            {/* Heading selector */}
            <select
              value={
                editor.isActive('heading', {level:1}) ? '1' :
                editor.isActive('heading', {level:2}) ? '2' :
                editor.isActive('heading', {level:3}) ? '3' : '0'
              }
              onMouseDown={e => e.stopPropagation()}
              onChange={e => {
                const v = e.target.value;
                if (v === '0') editor.chain().focus().setParagraph().run();
                else editor.chain().focus().setHeading({ level: parseInt(v) }).run();
              }}
              style={{
                background: T.bg3, border: `1px solid ${T.border}`, color: T.text1,
                borderRadius: '3px', padding: '2px 4px', fontSize: F.xs,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              <option value="0">Body</option>
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </select>
            <Sep/>

            {/* Format */}
            <Btn onAction={() => editor.chain().focus().toggleBold().run()}        active={editor.isActive('bold')}      title="Bold">      <b>B</b></Btn>
            <Btn onAction={() => editor.chain().focus().toggleItalic().run()}      active={editor.isActive('italic')}    title="Italic">    <i>I</i></Btn>
            <Btn onAction={() => editor.chain().focus().toggleUnderline().run()}   active={editor.isActive('underline')} title="Underline"> <u>U</u></Btn>
            <Btn onAction={() => editor.chain().focus().toggleStrike().run()}      active={editor.isActive('strike')}   title="Strikethrough"><s>S</s></Btn>
            <Sep/>

            {/* Color */}
            <label
              title="Text color"
              onMouseDown={e => e.stopPropagation()}
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                border: `1px solid ${T.border}`, borderRadius: '3px',
                padding: '1px 5px', cursor: 'pointer', flexShrink: 0,
                fontSize: F.sm, color: T.text1, position: 'relative',
              }}
            >
              A
              <span style={{
                width: '12px', height: '3px', display: 'inline-block',
                background: editor.getAttributes('textStyle').color || T.text0,
              }}/>
              <input
                type="color"
                defaultValue="#c9cdd6"
                onChange={e => editor.chain().focus().setColor(e.target.value).run()}
                style={{ position: 'absolute', opacity: 0, inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
            </label>
            <Sep/>

            {/* Lists */}
            <Btn onAction={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Bullet list"> •≡</Btn>
            <Btn onAction={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1≡</Btn>
            <Btn onAction={() => editor.chain().focus().toggleTaskList().run()}    active={editor.isActive('taskList')}    title="Task list">   ☑</Btn>
            <Sep/>

            {/* Link */}
            <Btn onAction={insertLink} active={editor.isActive('link')} title="Insert link">🔗</Btn>
          </div>
        )}

        {/* Editor content area */}
        <div
          onClick={!editing ? startEditing : undefined}
          style={{ padding: editing ? '4px 6px 72px' : '4px 6px', minHeight: editing ? `${minRows * 24}px` : '28px', cursor: 'text' }}
        >
          {isEmpty && !editing ? (
            <span style={{ color: T.text3, fontStyle: 'italic', fontSize: F.sm }}>click to edit</span>
          ) : (
            <EditorContent editor={editor}/>
          )}
        </div>
      </div>
    </div>
  );
}
