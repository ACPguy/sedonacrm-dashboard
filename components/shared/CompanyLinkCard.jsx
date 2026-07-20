import React from 'react';
import { T } from '../../lib/theme';

const F = { xs: '12px', sm: '13px' };

// Read-only display card for a linked company (Vendor Company / Tenant Company).
// icon: a phosphor-icons component (e.g. Truck, Storefront)
// name: company display name, or null/undefined for empty state
// link: url string or null — when present, name becomes a clickable ↗ link
// badge: optional small text pill after the name (e.g. property code) — omit for none
export default function CompanyLinkCard({ icon: Icon, name, link, badge }) {
  if (!name) {
    return (
      <div style={{ fontSize: F.sm, color: T.text3, padding: '7px 10px', background: T.bg3, border: `0.5px solid ${T.border}`, borderRadius: '6px' }}>—</div>
    );
  }
  return (
    <div style={{ background: T.bg3, border: `0.5px solid ${T.border}`, borderRadius: '6px', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {Icon && <Icon size={32} weight="bold" style={{ color: T.text2, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ color: T.accent, fontSize: F.sm, fontWeight: '500', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            {name}
            <span style={{ fontSize: '10px', color: T.text2, lineHeight: 1 }}>↗</span>
          </a>
        ) : (
          <span style={{ color: T.accent, fontSize: F.sm, fontWeight: '500' }}>{name}</span>
        )}
        {badge && (
          <span style={{ fontSize: '10px', fontWeight: '600', color: T.text1, background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '4px', padding: '1px 6px' }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
