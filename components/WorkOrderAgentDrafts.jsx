import React, { useState, useEffect } from 'react';
import { T } from '../lib/theme';
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const TRIGGER_BADGE = {
  past_due:    { label: 'past due',    bg: '#450a0a', color: '#ef4444' },
  no_activity: { label: 'no activity', bg: '#1e3a5f', color: '#4a9eff' },
};

function WORow({ item }) {
  const [hov, setHov] = useState(false);

  const badge = item.trigger
    ? TRIGGER_BADGE[item.trigger]
    : item.estimate_amount != null
      ? { label: '$' + Number(item.estimate_amount).toLocaleString('en-US', { maximumFractionDigits: 0 }), bg: '#2d1a00', color: T.warn }
      : null;

  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 16px',
        borderBottom: `0.5px solid ${T.border}`,
        background: hov ? T.bg3 : 'transparent',
        transition: 'background 0.1s',
        cursor: item.url ? 'pointer' : 'default',
        minHeight: '44px',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {badge && (
        <span style={{
          fontSize: F.xs,
          padding: '2px 7px',
          borderRadius: '10px',
          background: badge.bg,
          color: badge.color,
          fontWeight: '600',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {badge.label}
        </span>
      )}
      <span style={{
        fontSize: F.sm,
        color: T.text0,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.title}
      </span>
      <span style={{ fontSize: F.xs, color: T.text2, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {item.meta}
      </span>
    </div>
  );

  if (item.url) return <a href={item.url} style={{ display: 'block', textDecoration: 'none' }}>{inner}</a>;
  return inner;
}

function SubHeading({ label }) {
  return (
    <div style={{
      padding: '6px 16px 4px',
      fontSize: F.xs,
      fontWeight: '700',
      color: T.text2,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderBottom: `0.5px solid ${T.border}`,
      background: T.bg2,
    }}>
      {label}
    </div>
  );
}

export default function WorkOrderAgentDrafts({ compact = false, expanded }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (expanded === true)  setCollapsed(false);
    if (expanded === false) setCollapsed(true);
  }, [expanded]);

  useEffect(() => {
    fetch('/api/agents/work-order-agent')
      .then(r => r.json())
      .then(d  => { setData(d);          setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const nudgeItems    = data?.nudge_items     || [];
  const highCostItems = data?.high_cost_items || [];
  const totalCount    = nudgeItems.length + highCostItems.length;
  const showSubheads  = nudgeItems.length > 0 && highCostItems.length > 0;

  return (
    <div style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '8px', overflow: 'visible' }}>
      {/* Card header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '10px 16px',
          borderBottom: `0.5px solid ${T.border}`,
          background: T.bg3,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none',
          minHeight: '44px',
        }}>
        <span style={{ fontSize: F.md }}>🔧</span>
        <span style={{ fontSize: F.sm, fontWeight: '700', color: T.text1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Work Orders
        </span>
        <span style={{
          fontSize: F.xs,
          background: T.bg2,
          color: T.text1,
          padding: '1px 7px',
          borderRadius: '10px',
          fontWeight: '600',
        }}>
          {loading ? '…' : totalCount}
        </span>
        <span style={{ fontSize: F.xs, color: T.text2, flexShrink: 0, marginLeft: 'auto' }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          {loading && (
            <div style={{ padding: '16px', fontSize: F.sm, color: T.text2, textAlign: 'center' }}>Loading…</div>
          )}
          {error && !loading && (
            <div style={{ padding: '12px 16px', fontSize: F.sm, color: T.danger }}>{error}</div>
          )}
          {!loading && !error && totalCount === 0 && (
            <div style={{ padding: '16px', fontSize: F.sm, color: T.text3, textAlign: 'center' }}>
              No work order alerts
            </div>
          )}
          {!loading && !error && totalCount > 0 && (
            <div style={{ maxHeight: '400px', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {nudgeItems.length > 0 && (
                <>
                  {showSubheads && <SubHeading label="Nudges" />}
                  {nudgeItems.map((item, i) => <WORow key={i} item={item} />)}
                </>
              )}
              {highCostItems.length > 0 && (
                <>
                  {showSubheads && <SubHeading label="High Cost" />}
                  {highCostItems.map((item, i) => <WORow key={i} item={item} />)}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
