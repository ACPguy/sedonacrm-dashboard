import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { MagnifyingGlass } from '@phosphor-icons/react';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const T = {
  bg0:'#161920', bg1:'#1e2128', bg2:'#252930', bg3:'#2e3240',
  text0:'#c9cdd6', text1:'#8a95a8', text2:'#5a6272', text3:'#4a5264',
  accent:'#6e9fd8', border:'#2e3240',
  danger:'#e07070', warn:'#d4924a', success:'#6ab06a', purple:'#9a7ad4',
};
const F = { xs:'12px', sm:'13px', base:'14px', md:'15px', lg:'17px', xl:'22px' };

const TASK_BADGE = {
  work_order: { label: 'WO', color: '#e07070' },
  task:       { label: 'Task', color: '#6e9fd8' },
  project:    { label: 'Project', color: '#9a7ad4' },
  acp_task:   { label: 'ACP', color: '#d4924a' },
  sg_task:    { label: 'S&G', color: '#6ab06a' },
  note:       { label: 'Note', color: '#8a95a8' },
};

const MODULE_LABELS = {
  tasks:        'Tasks',
  work_orders:  'Work Orders',
  tenants:      'Tenants',
  issues:       'Issues',
  contacts:     'Contacts',
  vendors:      'Vendors',
  properties:   'Properties',
  suites:       'Suites',
};

// Modules queried in global mode (work_orders handled via tasks query with filter)
const GLOBAL_MODULES = ['tasks', 'tenants', 'issues', 'contacts', 'vendors', 'properties', 'suites'];

// Modules that have a defined search query
const MODULE_HAS_SEARCH = new Set([...GLOBAL_MODULES, 'work_orders']);

function detectModule(pathname) {
  if (pathname.startsWith('/tasks'))         return 'tasks';
  if (pathname.startsWith('/tenants'))       return 'tenants';
  if (pathname.startsWith('/work-orders'))   return 'work_orders';
  if (pathname.startsWith('/issues'))        return 'issues';
  if (pathname.startsWith('/contacts'))      return 'contacts';
  if (pathname.startsWith('/vendors'))       return 'vendors';
  if (pathname.startsWith('/owners'))        return 'owners';
  if (pathname.startsWith('/suites'))        return 'suites';
  if (pathname.startsWith('/rent-schedule')) return 'rent_schedule';
  if (pathname.startsWith('/properties'))    return 'properties';
  return null;
}

function safeEncode(q) {
  // Strip chars that break PostgREST or=() syntax, then URL-encode
  return encodeURIComponent(q.replace(/[(),*%]/g, ' ').replace(/\s+/g, ' ').trim());
}

async function sbSearch(path) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

async function searchModule(moduleKey, q) {
  const t = safeEncode(q);
  const isNum = /^\d+$/.test(q.trim());

  switch (moduleKey) {
    case 'tasks':
    case 'work_orders': {
      const rtFilter = moduleKey === 'work_orders' ? '&record_type=eq.work_order' : '';
      const orParts = [`title.ilike.*${t}*`, `prop_code.ilike.*${t}*`];
      if (isNum) orParts.push(`task_num.eq.${q.trim()}`);
      const rows = await sbSearch(
        `tasks?select=id,task_num,title,prop_code,record_type,status&or=(${orParts.join(',')})${rtFilter}&limit=5`
      );
      return rows.map(r => {
        const b = TASK_BADGE[r.record_type] ?? { label: r.record_type || '?', color: T.text2 };
        return {
          module: 'tasks',
          display: r.prop_code ? `${r.prop_code} — ${r.title || ''}` : (r.title || '(untitled)'),
          badgeLabel: b.label,
          badgeColor: b.color,
          url: `/tasks/${r.task_num}`,
        };
      });
    }
    case 'tenants': {
      const rows = await sbSearch(
        `tenants?select=id,podio_id,entity_name,tenant_dba,prop_code,lease_status&or=(entity_name.ilike.*${t}*,tenant_dba.ilike.*${t}*)&limit=5`
      );
      return rows.map(r => ({
        module: 'tenants',
        display: `${r.entity_name || ''}${r.tenant_dba && r.tenant_dba !== r.entity_name ? ` (${r.tenant_dba})` : ''} — ${r.prop_code || ''}`,
        badgeLabel: 'Tenant',
        badgeColor: '#6e9fd8',
        url: `/tenants/${r.podio_id}`,
      }));
    }
    case 'issues': {
      const rows = await sbSearch(
        `issues?select=id,podio_id,issue_name,prop_code,status&or=(issue_name.ilike.*${t}*,prop_code.ilike.*${t}*)&limit=5`
      );
      return rows.map(r => ({
        module: 'issues',
        display: r.prop_code ? `${r.prop_code} — ${r.issue_name || ''}` : (r.issue_name || '(untitled)'),
        badgeLabel: 'Issue',
        badgeColor: '#e07070',
        url: `/issues/${r.podio_id}`,
      }));
    }
    case 'contacts': {
      const rows = await sbSearch(
        `contacts?select=id,podio_id,full_name,first_name,last_name,company_dba,email&or=(full_name.ilike.*${t}*,company_dba.ilike.*${t}*,email.ilike.*${t}*)&limit=5`
      );
      return rows.map(r => ({
        module: 'contacts',
        display: `${r.full_name || ''}${r.company_dba ? ` — ${r.company_dba}` : ''}`,
        badgeLabel: 'Contact',
        badgeColor: '#9a7ad4',
        url: `/contacts/${r.podio_id}`,
      }));
    }
    case 'vendors': {
      const rows = await sbSearch(
        `vendors?select=id,podio_id,entity_name,company_dba&or=(entity_name.ilike.*${t}*,company_dba.ilike.*${t}*)&limit=5`
      );
      return rows.map(r => ({
        module: 'vendors',
        display: `${r.entity_name || ''}${r.company_dba && r.company_dba !== r.entity_name ? ` (${r.company_dba})` : ''}`,
        badgeLabel: 'Vendor',
        badgeColor: '#d4924a',
        url: r.podio_id ? `/vendors/${r.podio_id}` : `/vendors/X${r.id.slice(-6)}`,
      }));
    }
    case 'properties': {
      const rows = await sbSearch(
        `properties?select=id,podio_id,prop_code,property_name,property_marketing_name,address&or=(prop_code.ilike.*${t}*,property_name.ilike.*${t}*,property_marketing_name.ilike.*${t}*,address.ilike.*${t}*)&limit=5`
      );
      return rows.map(r => ({
        module: 'properties',
        display: `${r.prop_code} — ${r.property_marketing_name || r.property_name || ''}`,
        badgeLabel: 'Property',
        badgeColor: '#6ab06a',
        url: `/properties/${r.podio_id ?? 'X' + r.id.slice(-6)}`,
      }));
    }
    case 'suites': {
      const rows = await sbSearch(
        `suites?select=id,podio_id,suite_num,prop_code,status&or=(suite_num.ilike.*${t}*,prop_code.ilike.*${t}*)&limit=5`
      );
      return rows.map(r => ({
        module: 'suites',
        display: `${r.prop_code}-${r.suite_num} (${r.status || ''})`,
        badgeLabel: 'Suite',
        badgeColor: '#8a95a8',
        url: `/suites/${r.podio_id}`,
      }));
    }
    default:
      return [];
  }
}

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: '10px',
      background: color,
      color: '#fff',
      borderRadius: '3px',
      padding: '1px 5px',
      fontWeight: '600',
      flexShrink: 0,
      whiteSpace: 'nowrap',
      lineHeight: '1.5',
    }}>
      {label}
    </span>
  );
}

function ResultRow({ item, isGlobal, router, onClose }) {
  return (
    <a
      href={item.url}
      onClick={e => {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onClose();
          router.push(item.url);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 12px',
        cursor: 'pointer',
        textDecoration: 'none',
        minHeight: '32px',
        background: 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.bg3; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Badge label={item.badgeLabel} color={item.badgeColor} />
      <span style={{
        flex: 1,
        fontSize: F.sm,
        color: T.text0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.display}
      </span>
      {isGlobal && (
        <span style={{ fontSize: '11px', color: T.text2, flexShrink: 0 }}>
          {MODULE_LABELS[item.module] ?? item.module}
        </span>
      )}
    </a>
  );
}

function SearchAllLink({ onSearchAll }) {
  return (
    <div style={{ borderTop: `0.5px solid ${T.border}`, padding: '7px 12px' }}>
      <span
        role="button"
        onClick={onSearchAll}
        style={{ fontSize: F.xs, color: T.accent, cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
      >
        Search all modules →
      </span>
    </div>
  );
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forceGlobal, setForceGlobal] = useState(false);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const currentModule = detectModule(router.pathname);
  const isContextMode = !!(currentModule && MODULE_HAS_SEARCH.has(currentModule) && !forceGlobal);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset on route change
  useEffect(() => {
    setForceGlobal(false);
    setQuery('');
    setResults(null);
    setOpen(false);
    clearTimeout(debounceRef.current);
  }, [router.pathname]);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const doSearch = useCallback(async (q, globalOverride = null) => {
    if (!q || q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setOpen(true);

    const useCtx = globalOverride !== null ? !globalOverride : isContextMode;
    const modules = useCtx ? [currentModule] : GLOBAL_MODULES;

    const settled = await Promise.allSettled(modules.map(m => searchModule(m, q)));
    const grouped = settled.map((s, i) => ({
      module: modules[i],
      items: s.status === 'fulfilled' ? s.value : [],
    }));

    setResults(grouped);
    setLoading(false);
  }, [isContextMode, currentModule]);

  const handleInput = e => {
    const q = e.target.value;
    setQuery(q);
    if (!q) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      clearTimeout(debounceRef.current);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setOpen(false);
    setLoading(false);
    clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };

  const closeDropdown = () => setOpen(false);

  const handleSearchAll = () => {
    setForceGlobal(true);
    if (query.length >= 2) doSearch(query, true);
  };

  // Click outside
  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const totalResults = results ? results.reduce((sum, g) => sum + g.items.length, 0) : 0;
  const hasResults = results !== null && totalResults > 0;
  const noResults = results !== null && !loading && totalResults === 0;
  const placeholder = isContextMode
    ? `Search ${MODULE_LABELS[currentModule] ?? currentModule}…`
    : 'Search everything…';

  return (
    <>
      <style>{`
        .crm-gs-input {
          height: 28px;
          background: ${T.bg2};
          border: 0.5px solid ${T.border};
          border-radius: 5px;
          padding: 4px 26px 4px 28px;
          font-size: ${F.sm};
          color: ${T.text0};
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .crm-gs-input::placeholder { color: ${T.text2}; }
        .crm-gs-input:focus { border-color: ${T.accent}; }
      `}</style>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          flexShrink: isMobile ? undefined : 0,
          flex: isMobile ? 1 : undefined,
          minWidth: isMobile ? 0 : undefined,
        }}
      >
        {/* Input wrapper */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: '8px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', pointerEvents: 'none', zIndex: 1,
          }}>
            <MagnifyingGlass size={14} weight="bold" color={T.text2} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="crm-gs-input"
            style={{ width: isMobile ? '100%' : '220px' }}
            value={query}
            onChange={handleInput}
            onFocus={() => { if (query.length >= 2) setOpen(true); }}
            placeholder={placeholder}
            autoComplete="off"
          />
          {query.length > 0 && (
            <button
              onMouseDown={e => { e.preventDefault(); handleClear(); }}
              style={{
                position: 'absolute', right: '5px',
                background: 'transparent', border: 'none',
                color: T.text2, cursor: 'pointer',
                padding: '2px 3px',
                fontSize: '15px', lineHeight: 1,
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = T.text0; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.text2; }}
            >×</button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '480px',
            overflowY: 'auto',
            background: T.bg1,
            border: `0.5px solid ${T.border}`,
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 9999,
          }}>
            {loading && (
              <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text2, fontSize: F.sm }}>
                Searching…
              </div>
            )}

            {noResults && (
              <>
                <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text2, fontSize: F.sm }}>
                  No results for "{query}"
                </div>
                {isContextMode && <SearchAllLink onSearchAll={handleSearchAll} />}
              </>
            )}

            {hasResults && (
              <>
                {results.filter(g => g.items.length > 0).map((group, gi) => (
                  <React.Fragment key={group.module}>
                    {gi > 0 && <div style={{ height: '0.5px', background: T.border }} />}
                    {!isContextMode && (
                      <div style={{
                        fontSize: '10px', color: T.text3,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        padding: '8px 12px 4px', fontWeight: '600',
                      }}>
                        {MODULE_LABELS[group.module] ?? group.module}
                      </div>
                    )}
                    {group.items.map((item, ii) => (
                      <ResultRow
                        key={`${group.module}-${ii}`}
                        item={item}
                        isGlobal={!isContextMode}
                        router={router}
                        onClose={closeDropdown}
                      />
                    ))}
                  </React.Fragment>
                ))}
                {isContextMode && <SearchAllLink onSearchAll={handleSearchAll} />}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
