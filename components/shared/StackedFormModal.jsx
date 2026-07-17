// ─────────────────────────────────────────────────────────────────────────────
// StackedFormModal.jsx — generic overlay shell for full-form create flows
//
// Stacking convention: this shell does NOT auto-manage stacking depth.
// When composing nested modals (e.g. a second modal opened from within a first),
// the parent is responsible for passing increasing zIndex values to each instance.
// Default is 300; inner modals should pass 310, 320, etc.
//
// Deliberate deviations from EmailCompose pattern:
//   - No backdrop-click-to-close — accidental outside tap must never discard input
//   - No Escape-key-to-close — same reason
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { T } from '../../lib/theme';

const F = { xs: '12px', sm: '13px', base: '14px' };

export default function StackedFormModal({
  title,
  onClose,
  children,
  footer,
  maxWidth = '520px',
  zIndex = 300,
}) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      zIndex,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
    }}>
      <div style={{
        background: T.bg1,
        border: isMobile ? 'none' : `0.5px solid ${T.border}`,
        borderRadius: isMobile ? 0 : '8px',
        width: isMobile ? '100%' : maxWidth,
        maxWidth: isMobile ? '100%' : maxWidth,
        height: isMobile ? '100vh' : 'auto',
        maxHeight: isMobile ? '100vh' : '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: `0.5px solid ${T.border}`,
          background: T.bg0,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: F.base, fontWeight: '600', color: T.text0 }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.text2,
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = T.text0}
            onMouseLeave={e => e.currentTarget.style.color = T.text2}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}>
          {children}
        </div>

        {/* Footer — only rendered when footer prop is provided */}
        {footer && (
          <div style={{
            borderTop: `0.5px solid ${T.border}`,
            padding: '10px 16px',
            background: T.bg0,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
