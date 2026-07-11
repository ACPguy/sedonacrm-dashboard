import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Funnel, Rows, SquaresFour, Bell, ArrowSquareIn, CaretDown, CaretRight } from '@phosphor-icons/react';
import { T } from '../lib/theme';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const sbFetch = async (table, params = '') => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

const F = { xs: '12px', sm: '13px', base: '14px', lg: '17px' };
const css = {
  th: { fontSize: F.xs, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '5px 8px', fontWeight: '600', whiteSpace: 'nowrap', textAlign: 'left', cursor: 'pointer', userSelect: 'none', background: T.bg2 },
  td: { fontSize: F.sm, color: T.text0, padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};

// ── Stage configuration ────────────────────────────────────────────────────────

const STAGE_GROUP_MAP = {
  // Early
  'New Inquiry': 'Early', 'Info Sent': 'Early',
  'Showing Scheduled': 'Early', 'Showing Complete': 'Early',
  // Mid
  'Application Sent': 'Mid', 'Qualifying / Screening': 'Mid', LOI: 'Mid',
  // Late
  'Lease Drafting': 'Late', 'Fully Executed': 'Late', 'Move-In': 'Late',
  // Exited
  Dead: 'Exited', 'On Hold': 'Exited', 'Landlord Declined Use': 'Exited',
};

// Stage display order within each section for board columns
const SECTION_STAGE_ORDER = {
  Early:  ['New Inquiry', 'Info Sent', 'Showing Scheduled', 'Showing Complete'],
  Mid:    ['Application Sent', 'Qualifying / Screening', 'LOI'],
  Late:   ['Lease Drafting', 'Fully Executed', 'Move-In'],
  Exited: ['On Hold', 'Dead', 'Landlord Declined Use'],
};

const GROUP_STYLE = {
  Early:  { color: T.warn,    bg: '#3d2e1a' },
  Mid:    { color: T.accent,  bg: '#1a2e3a' },
  Late:   { color: T.success, bg: '#1e2a1e' },
  Exited: { color: T.text2,   bg: T.bg3 },
};

const getDisplayGroup = r => STAGE_GROUP_MAP[r.stage] || 'Early';

const daysInStage = r => {
  const ref = r.updated_at || r.created_at;
  if (!ref) return null;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
};

const isQualPending = r => {
  const g = getDisplayGroup(r);
  return (g === 'Mid' || g === 'Late') && !r.qual_passed;
};

// ── Small display components ───────────────────────────────────────────────────

const StagePill = ({ stage }) => {
  const g = STAGE_GROUP_MAP[stage] || 'Early';
  const { color, bg } = GROUP_STYLE[g];
  return (
    <span style={{ fontSize: F.xs, padding: '2px 7px', borderRadius: '3px', fontWeight: '500', color, background: bg, whiteSpace: 'nowrap' }}>
      {stage || '—'}
    </span>
  );
};

const QualBadge = ({ record }) => {
  if (!isQualPending(record)) return null;
  return (
    <span style={{ fontSize: '10px', padding: '1px 4px', borderRadius: '3px', fontWeight: '600', color: '#f0d060', background: '#3d3500', whiteSpace: 'nowrap' }}>
      QUAL
    </span>
  );
};

const SourceIcon = ({ pipeline_source }) => {
  if (pipeline_source === 'notice_triggered') {
    return <Bell size={13} style={{ color: T.warn, flexShrink: 0 }} title="Notice-triggered vacancy"/>;
  }
  return <ArrowSquareIn size={13} style={{ color: T.accent, flexShrink: 0 }} title="Inbound inquiry"/>;
};

const SuiteStatusBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    Occupied:                      [T.success, '#1e2a1e', 'Occupied'],
    'Occupied / For Lease':        [T.warn,    '#3d2e1a', 'Occ/Lease'],
    'Vacant / For Lease':          [T.accent,  '#1a2e3a', 'Vac/Lease'],
    'Vacant / For Lease — Pending':[T.purple,  '#2a1e3a', 'Pending'],
    Archived:                      [T.text3,   T.bg3,     'Archived'],
  };
  const [c, bg, label] = map[status] || [T.text2, T.bg3, status];
  return (
    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', fontWeight: '500', color: c, background: bg, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
};

const ColorLegend = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
    {[['Early', 'New Inquiry → Showing'], ['Mid', 'Application → LOI'], ['Late', 'Lease Drafting → Move-In']].map(([group, tip]) => {
      const { color, bg } = GROUP_STYLE[group];
      return (
        <span key={group} title={tip} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: F.xs, color: T.text2 }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: bg, border: `1px solid ${color}` }}/>
          {group}
        </span>
      );
    })}
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: F.xs, color: T.text2 }}>
      <span style={{ fontSize: '10px', color: '#f0d060', fontWeight: '600' }}>QUAL</span> = qual pending
    </span>
  </div>
);

// ── List view ──────────────────────────────────────────────────────────────────

const PipelineList = ({ rows, suiteStatusMap, propFilter, search, showExited }) => {
  const [sortCol, setSortCol] = useState('_days');
  const [sortDir, setSortDir] = useState('desc');

  const enriched = rows.map(r => ({ ...r, _days: daysInStage(r), _group: getDisplayGroup(r) }));

  const filtered = enriched.filter(r => {
    if (!showExited && r._group === 'Exited') return false;
    if (propFilter && r.prop_code !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.prospect_name || r.tnt_dba_name || '').toLowerCase().includes(q) ||
             (r.prop_code || '').toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortCol === '_days') { av = a._days ?? -1; bv = b._days ?? -1; }
    else { av = a[sortCol] ?? ''; bv = b[sortCol] ?? ''; }
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggle = c => {
    if (c === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(c); setSortDir('desc'); }
  };
  const Th = ({ c, label, align = 'left', title: ttl }) => (
    <th style={{ ...css.th, textAlign: align }} onClick={() => toggle(c)} title={ttl}>
      {label}
      {sortCol === c
        ? <span style={{ marginLeft: '3px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
        : <span style={{ marginLeft: '3px', color: T.bg3 }}>↕</span>}
    </th>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Desktop table */}
      <table className="crm-list-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '26%' }}/>
          <col style={{ width: '11%' }}/>
          <col style={{ width: '16%' }}/>
          <col style={{ width: '7%' }}/>
          <col style={{ width: '5%' }}/>
          <col style={{ width: '6%' }}/>
          <col style={{ width: '11%' }}/>
          <col style={{ width: '9%' }}/>
          <col style={{ width: '9%' }}/>
        </colgroup>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <tr>
            <Th c="prospect_name"   label="Prospect / Business"/>
            <Th c="prop_code"       label="Prop / Suite"/>
            <Th c="stage"           label="Stage"/>
            <Th c="_days"           label="Days" align="right" title="Est. days in stage (based on last update date)"/>
            <Th c="pipeline_source" label="Src"/>
            <Th c="qual_passed"     label="Qual"/>
            <Th c="_suite_status"   label="Suite Status"/>
            <Th c="sqft"            label="Sq Ft" align="right"/>
            <Th c="_group"          label="Group"/>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={9} style={{ ...css.td, textAlign: 'center', padding: '32px', color: T.text3 }}>
                No pipeline records match
              </td>
            </tr>
          )}
          {sorted.map((r, i) => {
            const name = r.tnt_dba_name || r.prospect_name || '—';
            const propSuite = r.prop_code ? `${r.prop_code}${r.suite_num ? ' / ' + r.suite_num : ''}` : '—';
            const suiteStatus = r.suite_id ? suiteStatusMap[r.suite_id] : null;
            const { color: grpColor, bg: grpBg } = GROUP_STYLE[r._group] || GROUP_STYLE.Early;
            return (
              <tr key={r.id}
                onClick={() => console.log('[PipelineView] record id:', r.id)}
                style={{ borderBottom: `0.5px solid ${T.border}`, cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : T.bg0 }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg2}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : T.bg0}>
                <td style={{ ...css.td, fontWeight: '500', color: T.text0 }}>{name}</td>
                <td style={{ ...css.td, color: T.accent, fontSize: F.xs }}>{propSuite}</td>
                <td style={{ ...css.td }}>
                  <StagePill stage={r.stage}/>
                </td>
                <td style={{ ...css.td, textAlign: 'right', color: r._days != null && r._days > 30 ? T.warn : T.text1, fontWeight: r._days != null && r._days > 30 ? '600' : '400' }}>
                  {r._days ?? '—'}
                </td>
                <td style={{ ...css.td, textAlign: 'center' }}>
                  <SourceIcon pipeline_source={r.pipeline_source}/>
                </td>
                <td style={{ ...css.td }}>
                  <QualBadge record={r}/>
                </td>
                <td style={{ ...css.td }}>
                  <SuiteStatusBadge status={suiteStatus}/>
                </td>
                <td style={{ ...css.td, textAlign: 'right', color: T.text2 }}>
                  {r.sqft ? Number(r.sqft).toLocaleString() : '—'}
                </td>
                <td style={{ ...css.td }}>
                  <span style={{ fontSize: F.xs, padding: '1px 5px', borderRadius: '3px', color: grpColor, background: grpBg }}>{r._group}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="crm-mobile-cards">
        {sorted.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: T.text3, fontSize: F.sm }}>
            No pipeline records match
          </div>
        )}
        {sorted.map((r, i) => {
          const name = r.tnt_dba_name || r.prospect_name || '—';
          const suiteStatus = r.suite_id ? suiteStatusMap[r.suite_id] : null;
          const rowBg = i % 2 === 0 ? 'transparent' : T.bg0;
          return (
            <div key={r.id}
              onClick={() => console.log('[PipelineView] record id:', r.id)}
              style={{ padding: '12px 14px', borderBottom: `0.5px solid ${T.border}`, cursor: 'pointer', background: rowBg, minHeight: '44px' }}
              onMouseEnter={e => e.currentTarget.style.background = T.bg2}
              onMouseLeave={e => e.currentTarget.style.background = rowBg}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', overflow: 'hidden' }}>
                <span style={{ fontSize: F.xs, background: '#1a2e3a', color: T.accent, padding: '1px 6px', borderRadius: '3px', fontWeight: '600', flexShrink: 0 }}>
                  {r.prop_code || '—'}
                </span>
                <span style={{ fontWeight: '600', fontSize: F.base, color: T.text0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
                <SourceIcon pipeline_source={r.pipeline_source}/>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <StagePill stage={r.stage}/>
                {r._days != null && (
                  <span style={{ fontSize: F.xs, color: r._days > 30 ? T.warn : T.text2 }}>{r._days}d</span>
                )}
                <QualBadge record={r}/>
                <SuiteStatusBadge status={suiteStatus}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Board card ─────────────────────────────────────────────────────────────────

const BoardCard = ({ r, suiteStatusMap }) => {
  const name = r.tnt_dba_name || r.prospect_name || '—';
  const days = daysInStage(r);
  const suiteStatus = r.suite_id ? suiteStatusMap[r.suite_id] : null;
  return (
    <div
      onClick={() => console.log('[PipelineView] record id:', r.id)}
      style={{ background: T.bg1, border: `0.5px solid ${T.border}`, borderRadius: '5px', padding: '8px 10px', marginBottom: '6px', cursor: 'pointer', minHeight: '44px' }}
      onMouseEnter={e => e.currentTarget.style.background = T.bg2}
      onMouseLeave={e => e.currentTarget.style.background = T.bg1}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontSize: F.sm, fontWeight: '600', color: T.text0, lineHeight: '1.3', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <SourceIcon pipeline_source={r.pipeline_source}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
        {r.prop_code && (
          <span style={{ fontSize: '11px', color: T.accent, fontWeight: '600' }}>
            {r.prop_code}{r.suite_num ? ' / ' + r.suite_num : ''}
          </span>
        )}
        {days != null && (
          <span style={{ fontSize: '11px', color: days > 30 ? T.warn : T.text2 }}>{days}d</span>
        )}
        <QualBadge record={r}/>
        <SuiteStatusBadge status={suiteStatus}/>
      </div>
    </div>
  );
};

// ── Board section ──────────────────────────────────────────────────────────────

const BoardSection = ({ section, stageMap, count, isOpen, onToggle, isMobileView }) => {
  const stageOrder = SECTION_STAGE_ORDER[section] || [];
  const stagesWithData = stageOrder.filter(s => stageMap[s] && stageMap[s].length > 0);
  const unknownStages = Object.keys(stageMap).filter(s => !stageOrder.includes(s));
  const allStages = [...stagesWithData, ...unknownStages];
  const { color } = GROUP_STYLE[section];

  return (
    <div style={{ marginBottom: '10px', border: `0.5px solid ${T.border}`, borderRadius: '6px', overflow: 'hidden' }}>
      {/* Section header — shown on desktop only (mobile has pill selector) */}
      {!isMobileView && (
        <button
          onClick={onToggle}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: T.bg2, border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: '36px' }}
          onMouseEnter={e => e.currentTarget.style.background = T.bg3}
          onMouseLeave={e => e.currentTarget.style.background = T.bg2}>
          {isOpen
            ? <CaretDown size={13} style={{ color: T.text2, flexShrink: 0 }}/>
            : <CaretRight size={13} style={{ color: T.text2, flexShrink: 0 }}/>}
          <span style={{ fontSize: F.sm, fontWeight: '600', color, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
            {section}
          </span>
          <span style={{ fontSize: F.xs, color: T.text3 }}>{count}</span>
        </button>
      )}

      {/* Stage columns — visible when open */}
      {isOpen && (
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '10px',
          overflowX: isMobileView ? 'visible' : 'auto',
          flexDirection: isMobileView ? 'column' : 'row',
          WebkitOverflowScrolling: 'touch',
        }}>
          {allStages.length === 0 && (
            <div style={{ color: T.text3, fontSize: F.xs, padding: '12px 0', width: '100%', textAlign: 'center' }}>
              No records
            </div>
          )}
          {allStages.map(stage => {
            const cards = stageMap[stage] || [];
            if (!isMobileView && cards.length === 0) return null;
            return (
              <div key={stage} style={{ minWidth: isMobileView ? 'auto' : '180px', maxWidth: isMobileView ? 'auto' : '220px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', paddingBottom: '4px', borderBottom: `0.5px solid ${T.border}` }}>
                  <span style={{ fontSize: F.xs, fontWeight: '600', color: T.text2, textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1 }}>
                    {stage}
                  </span>
                  <span style={{ fontSize: F.xs, color: T.text3, background: T.bg3, padding: '0 4px', borderRadius: '3px' }}>
                    {cards.length}
                  </span>
                </div>
                {isMobileView && cards.length === 0 && (
                  <div style={{ fontSize: F.xs, color: T.text3, fontStyle: 'italic', paddingBottom: '4px' }}>No records</div>
                )}
                {cards.map(r => <BoardCard key={r.id} r={r} suiteStatusMap={{}}/>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Board view ─────────────────────────────────────────────────────────────────

const PipelineBoard = ({ rows, suiteStatusMap, propFilter, search, showExited, defaultOpenSection }) => {
  const SECTIONS = showExited ? ['Early', 'Mid', 'Late', 'Exited'] : ['Early', 'Mid', 'Late'];

  const [openSections, setOpenSections] = useState(() => {
    const init = {};
    SECTIONS.forEach(s => { init[s] = s === defaultOpenSection; });
    return init;
  });
  const [mobileSection, setMobileSection] = useState(defaultOpenSection || 'Mid');

  const filtered = rows.filter(r => {
    if (propFilter && r.prop_code !== propFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.prospect_name || r.tnt_dba_name || '').toLowerCase().includes(q) ||
             (r.prop_code || '').toLowerCase().includes(q);
    }
    return true;
  });

  const enriched = filtered.map(r => ({ ...r, _group: getDisplayGroup(r) }));

  // Group records by section then by stage; sort cards by days desc within each stage
  const bySection = {};
  SECTIONS.forEach(s => { bySection[s] = {}; });
  enriched.forEach(r => {
    const grp = r._group;
    if (!SECTIONS.includes(grp)) return;
    if (!bySection[grp][r.stage]) bySection[grp][r.stage] = [];
    bySection[grp][r.stage].push(r);
  });
  Object.values(bySection).forEach(stageMap => {
    Object.values(stageMap).forEach(cards => {
      cards.sort((a, b) => (daysInStage(b) ?? -1) - (daysInStage(a) ?? -1));
    });
  });

  const sectionCount = s => enriched.filter(r => r._group === s).length;
  const toggleSection = s => setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  return (
    <>
      {/* Desktop board */}
      <div className="crm-desktop-only" style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {SECTIONS.map(s => (
          <BoardSection
            key={s}
            section={s}
            stageMap={bySection[s]}
            count={sectionCount(s)}
            isOpen={!!openSections[s]}
            onToggle={() => toggleSection(s)}
            isMobileView={false}
          />
        ))}
      </div>

      {/* Mobile board */}
      <div className="crm-mobile-only" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Section pill selector */}
        <div style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: `0.5px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', flexShrink: 0 }}>
          {SECTIONS.map(s => {
            const { color } = GROUP_STYLE[s];
            const cnt = sectionCount(s);
            const active = mobileSection === s;
            return (
              <button key={s} onClick={() => setMobileSection(s)}
                style={{ padding: '6px 14px', borderRadius: '4px', border: `0.5px solid ${active ? color : T.border}`, cursor: 'pointer', fontSize: F.xs, whiteSpace: 'nowrap', minHeight: '36px', flexShrink: 0,
                  background: active ? GROUP_STYLE[s].bg : 'transparent', color: active ? color : T.text2, fontWeight: active ? '600' : '400' }}>
                {s} ({cnt})
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          <BoardSection
            section={mobileSection}
            stageMap={bySection[mobileSection] || {}}
            count={sectionCount(mobileSection)}
            isOpen={true}
            onToggle={() => {}}
            isMobileView={true}
          />
        </div>
      </div>
    </>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function PipelineView({ propCode }) {
  const [rows, setRows]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [suiteStatusMap, setSuiteMap]   = useState({});
  const [viewMode, setViewMode]         = useState('list');
  const [propFilter, setPropFilter]     = useState('');
  const [search, setSearch]             = useState('');
  const [showExited, setShowExited]     = useState(false);

  const fetchRows = useCallback(async (withExited) => {
    setLoading(true);
    setError(null);
    try {
      let params = 'select=id,prop_code,stage,status,prospect_name,tnt_dba_name,suite_num,sqft,pipeline_source,source,qual_passed,updated_at,created_at,suite_id';
      params += '&order=updated_at.asc.nullslast';
      if (!withExited) params += '&status=in.(Open,active,Active)';
      if (propCode) params += `&prop_code=eq.${encodeURIComponent(propCode)}`;

      const data = await sbFetch('leasing_pipeline', params);
      setRows(data || []);

      // Batch-fetch suite statuses
      const suiteIds = [...new Set((data || []).filter(r => r.suite_id).map(r => r.suite_id))];
      if (suiteIds.length > 0) {
        sbFetch('suites', `id=in.(${suiteIds.join(',')})&select=id,status`)
          .then(suites => {
            const map = {};
            suites.forEach(s => { map[s.id] = s.status; });
            setSuiteMap(map);
          })
          .catch(() => {});
      } else {
        setSuiteMap({});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [propCode]);

  useEffect(() => { fetchRows(showExited); }, [fetchRows, showExited]);

  // Derived
  const propCodes = useMemo(() => [...new Set(rows.map(r => r.prop_code).filter(Boolean))].sort(), [rows]);

  const activeRows = useMemo(() => rows.filter(r => getDisplayGroup(r) !== 'Exited'), [rows]);
  const statsEarly = useMemo(() => activeRows.filter(r => getDisplayGroup(r) === 'Early').length, [activeRows]);
  const statsMid   = useMemo(() => activeRows.filter(r => getDisplayGroup(r) === 'Mid').length, [activeRows]);
  const statsLate  = useMemo(() => activeRows.filter(r => getDisplayGroup(r) === 'Late').length, [activeRows]);

  const defaultOpenSection = useMemo(() => {
    const counts = { Early: statsEarly, Mid: statsMid, Late: statsLate };
    return Object.entries(counts).reduce((best, [k, v]) => v > counts[best] ? k : best, 'Mid');
  }, [statsEarly, statsMid, statsLate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: T.bg1 }}>
      {/* ── Header ── */}
      <div style={{ padding: '10px 16px 8px', borderBottom: `0.5px solid ${T.border}`, background: T.bg0, flexShrink: 0 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <Funnel size={22} weight="bold" style={{ color: T.accent, flexShrink: 0 }}/>
          <span style={{ fontSize: F.lg, fontWeight: '600', color: T.text0 }}>Leasing Pipeline</span>
          <span style={{ fontSize: F.xs, color: T.text3 }}>{activeRows.length} active</span>

          {/* Stat pills — hidden on mobile to save space */}
          <div className="mobile-hidden" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
            {[['Early', statsEarly, T.warn, '#3d2e1a'], ['Mid', statsMid, T.accent, '#1a2e3a'], ['Late', statsLate, T.success, '#1e2a1e']].map(([lbl, cnt, color, bg]) => (
              <span key={lbl} style={{ fontSize: F.xs, padding: '2px 8px', borderRadius: '3px', color, background: bg, whiteSpace: 'nowrap' }}>
                {lbl}: {cnt}
              </span>
            ))}
          </div>

          {/* View mode toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', background: T.bg2, borderRadius: '5px', padding: '2px', border: `0.5px solid ${T.border}`, flexShrink: 0 }}>
            <button onClick={() => setViewMode('list')} title="List view"
              style={{ padding: '5px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: viewMode === 'list' ? T.bg3 : 'transparent', color: viewMode === 'list' ? T.text0 : T.text2, display: 'flex', alignItems: 'center', minHeight: '30px' }}>
              <Rows size={15}/>
            </button>
            <button onClick={() => setViewMode('board')} title="Board view"
              style={{ padding: '5px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: viewMode === 'board' ? T.bg3 : 'transparent', color: viewMode === 'board' ? T.text0 : T.text2, display: 'flex', alignItems: 'center', minHeight: '30px' }}>
              <SquaresFour size={15}/>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Property dropdown — only when not already filtered by propCode (embedded) */}
          {!propCode && (
            <select value={propFilter} onChange={e => setPropFilter(e.target.value)}
              style={{ background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '5px', padding: '4px 10px', color: propFilter ? T.text0 : T.text2, fontSize: F.xs, outline: 'none', cursor: 'pointer', minHeight: '30px', flexShrink: 0 }}>
              <option value="">All Properties</option>
              {propCodes.map(pc => <option key={pc} value={pc}>{pc}</option>)}
            </select>
          )}

          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '150px', maxWidth: '240px' }}>
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position: 'absolute', left: '7px', background: 'transparent', border: 'none', cursor: 'pointer', color: T.text2, fontSize: '14px', lineHeight: 1, padding: 0, zIndex: 1 }}>
                ×
              </button>
            )}
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); e.target.blur(); } }}
              placeholder="Search prospect, prop…"
              style={{ width: '100%', background: T.bg2, border: `0.5px solid ${T.border}`, borderRadius: '5px', padding: `4px 10px 4px ${search ? '26px' : '10px'}`, color: T.text0, fontSize: F.xs, outline: 'none', minHeight: '30px' }}/>
          </div>

          {/* Show exited toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: F.xs, color: showExited ? T.text0 : T.text2, cursor: 'pointer', minHeight: '30px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <input type="checkbox" checked={showExited} onChange={e => setShowExited(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: T.accent }}/>
            Show exited
          </label>

          {/* Color legend — hidden on mobile */}
          <div className="mobile-hidden" style={{ marginLeft: 'auto' }}>
            <ColorLegend/>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading && (
        <div style={{ padding: '32px', textAlign: 'center', color: T.text3 }}>Loading pipeline…</div>
      )}
      {error && (
        <div style={{ padding: '32px', textAlign: 'center', color: T.danger }}>Error: {error}</div>
      )}
      {!loading && !error && viewMode === 'list' && (
        <PipelineList
          rows={rows}
          suiteStatusMap={suiteStatusMap}
          propFilter={propFilter}
          search={search}
          showExited={showExited}
        />
      )}
      {!loading && !error && viewMode === 'board' && (
        <PipelineBoard
          key={showExited ? 'exited' : 'active'}
          rows={rows}
          suiteStatusMap={suiteStatusMap}
          propFilter={propFilter}
          search={search}
          showExited={showExited}
          defaultOpenSection={defaultOpenSection}
        />
      )}
    </div>
  );
}
