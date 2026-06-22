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

const MODULE_KEYS = ['tasks','tenants','issues','contacts','vendors','properties','suites','inbox'];

const PATHNAME_TO_MODULE = {
  '/tasks': 'tasks',
  '/tenants': 'tenants',
  '/work-orders': 'work_orders',
  '/issues': 'issues',
  '/contacts': 'contacts',
  '/vendors': 'vendors',
  '/owners': 'owners',
  '/suites': 'suites',
  '/rent-schedule': 'rent_schedule',
  '/properties': 'properties',
  '/inbox': 'inbox',
};

const MODULE_LABELS = {
  tasks: 'tasks',
  tenants: 'tenants',
  work_orders: 'work orders',
  issues: 'issues',
  contacts: 'contacts',
  vendors: 'vendors',
  owners: 'owners',
  suites: 'suites',
  rent_schedule: 'rent schedule',
  properties: 'properties',
  inbox: 'inbox',
};

const TASK_BADGE = {
  work_order: { label: 'WO',      color: T.danger  },
  task:        { label: 'Task',    color: T.accent  },
  project:     { label: 'Project', color: T.purple  },
  acp_task:    { label: 'ACP',     color: T.warn    },
  sg_task:     { label: 'S&G',     color: T.success },
  note:        { label: 'Note',    color: T.text2   },
};

const sbFetch = (path) => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  }
}).then(r => r.json());

function enc(term) {
  return encodeURIComponent('%' + term + '%');
}

async function searchModule(moduleKey, term) {
  const e = enc(term);
  switch (moduleKey) {
    case 'tasks': {
      const rows = await sbFetch(`tasks?select=id,task_num,title,prop_code,record_type,status&or=(title.ilike.${e},prop_code.ilike.${e})&limit=5`);
      return {
        module: 'tasks',
        label: 'Tasks',
        items: (rows || []).map(row => {
          const badge = TASK_BADGE[row.record_type] || { label: 'Task', color: T.accent };
          return {
            display: row.prop_code ? `${row.prop_code} — ${row.title}` : row.title,
            badge: badge.label,
            badgeColor: badge.color,
            url: `/tasks/${row.task_num}`,
          };
        }),
      };
    }
    case 'tenants': {
      const rows = await sbFetch(`tenants?select=id,podio_id,entity_name,tenant_dba,prop_code&or=(entity_name.ilike.${e},tenant_dba.ilike.${e})&limit=5`);
      return {
        module: 'tenants',
        label: 'Tenants',
        items: (rows || []).map(row => ({
          display: `${row.entity_name}${row.tenant_dba && row.tenant_dba !== row.entity_name ? ` (${row.tenant_dba})` : ''} — ${row.prop_code}`,
          badge: 'Tenant',
          badgeColor: T.accent,
          url: `/tenants/${row.podio_id}`,
        })),
      };
    }
    case 'issues': {
      const rows = await sbFetch(`issues?select=id,podio_id,issue_name,prop_code,status&or=(issue_name.ilike.${e},prop_code.ilike.${e})&limit=5`);
      return {
        module: 'issues',
        label: 'Issues',
        items: (rows || []).map(row => ({
          display: `${row.prop_code} — ${row.issue_name}`,
          badge: 'Issue',
          badgeColor: T.danger,
          url: `/issues/${row.podio_id}`,
        })),
      };
    }
    case 'contacts': {
      const rows = await sbFetch(`contacts?select=id,podio_id,full_name,company_dba,email&or=(full_name.ilike.${e},company_dba.ilike.${e},email.ilike.${e})&limit=5`);
      return {
        module: 'contacts',
        label: 'Contacts',
        items: (rows || []).map(row => ({
          display: `${row.full_name}${row.company_dba ? ` — ${row.company_dba}` : ''}`,
          badge: 'Contact',
          badgeColor: T.purple,
          url: `/contacts/${row.podio_id}`,
        })),
      };
    }
    case 'vendors': {
      const rows = await sbFetch(`vendors?select=id,podio_id,entity_name,company_dba&or=(entity_name.ilike.${e},company_dba.ilike.${e})&limit=5`);
      return {
        module: 'vendors',
        label: 'Vendors',
        items: (rows || []).map(row => ({
          display: `${row.entity_name}${row.company_dba && row.company_dba !== row.entity_name ? ` (${row.company_dba})` : ''}`,
          badge: 'Vendor',
          badgeColor: T.warn,
          url: row.podio_id ? `/vendors/${row.podio_id}` : `/vendors/X${row.id.slice(-6)}`,
        })),
      };
    }
    case 'properties': {
      const rows = await sbFetch(`properties?select=id,podio_id,prop_code,property_name,property_marketing_name,address&or=(prop_code.ilike.${e},property_name.ilike.${e},property_marketing_name.ilike.${e},address.ilike.${e})&limit=5`);
      return {
        module: 'properties',
        label: 'Properties',
        items: (rows || []).map(row => ({
          display: `${row.prop_code} — ${row.property_marketing_name || row.property_name}`,
          badge: 'Property',
          badgeColor: T.success,
          url: row.podio_id ? `/properties/${row.podio_id}` : `/properties/X${row.id.slice(-6)}`,
        })),
      };
    }
    case 'suites': {
      const rows = await sbFetch(`suites?select=id,podio_id,suite_num,prop_code,status&or=(suite_num.ilike.${e},prop_code.ilike.${e})&limit=5`);
      return {
        module: 'suites',
        label: 'Suites',
        items: (rows || []).map(row => ({
          display: `${row.prop_code}-${row.suite_num} (${row.status})`,
          badge: 'Suite',
          badgeColor: T.text1,
          url: `/suites/${row.podio_id}`,
        })),
      };
    }
    case 'inbox': {
      const [threadsRes, messagesRes] = await Promise.allSettled([
        sbFetch(`email_threads?select=id,gmail_thread_id,subject,snippet,last_message_at&subject=ilike.${e}&limit=5`),
        sbFetch(`email_messages?select=id,thread_id,from_name,from_address,snippet,subject&or=(from_name.ilike.${e},from_address.ilike.${e},body_text.ilike.${e})&limit=5`),
      ]);
      const threads = threadsRes.status === 'fulfilled' ? (threadsRes.value || []) : [];
      const messages = messagesRes.status === 'fulfilled' ? (messagesRes.value || []) : [];
      const seen = new Set();
      const items = [];
      for (const row of threads) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        items.push({
          display: row.subject || '(no subject)',
          badge: 'Email',
          badgeColor: T.accent,
          url: `/inbox?thread=${row.gmail_thread_id || row.id}`,
          subLine: (row.snippet || '').slice(0, 60) || null,
        });
      }
      for (const row of messages) {
        if (seen.has(row.thread_id)) continue;
        seen.add(row.thread_id);
        const fromInfo = [row.from_name, row.from_address ? `<${row.from_address}>` : ''].filter(Boolean).join(' ').trim();
        items.push({
          display: row.subject || '(no subject)',
          badge: 'Email',
          badgeColor: T.accent,
          url: `/inbox?thread=${row.thread_id}`,
          subLine: (fromInfo || row.snippet || '').slice(0, 60) || null,
        });
      }
      return { module: 'inbox', label: 'Inbox', items: items.slice(0, 5) };
    }
    default:
      return { module: moduleKey, label: moduleKey, items: [] };
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [forceGlobal, setForceGlobal] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // Derive current module from pathname
  const base = '/' + router.pathname.split('/')[1];
  const currentModule = PATHNAME_TO_MODULE[base] ?? null;

  // Only modules searchable in global mode (work_orders/owners/rent_schedule handled via tasks/other)
  const searchableInGlobal = MODULE_KEYS; // tasks, tenants, issues, contacts, vendors, properties, suites

  // Map work_orders → tasks for actual DB query (tasks table covers WOs)
  const effectiveModule = currentModule === 'work_orders' ? 'tasks'
    : currentModule === 'owners' ? null
    : currentModule === 'rent_schedule' ? null
    : currentModule;

  const isGlobal = (effectiveModule === null) || forceGlobal;
  const moduleLabel = currentModule ? (MODULE_LABELS[currentModule] || currentModule) : null;

  // Reset forceGlobal when navigating to a different module
  const prevModuleRef = useRef(currentModule);
  useEffect(() => {
    if (prevModuleRef.current !== currentModule) {
      setForceGlobal(false);
      prevModuleRef.current = currentModule;
    }
  }, [currentModule]);

  // Search effect with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        let groups;
        if (isGlobal) {
          const settled = await Promise.allSettled(
            searchableInGlobal.map(key => searchModule(key, query))
          );
          groups = settled
            .filter(r => r.status === 'fulfilled' && r.value.items.length > 0)
            .map(r => r.value);
        } else {
          const group = await searchModule(effectiveModule, query);
          groups = group.items.length > 0 ? [group] : [];
        }
        setResults(groups);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, isGlobal, effectiveModule]);

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (e, url) => {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      router.push(url);
      setOpen(false);
      setQuery('');
    }
  };

  const placeholder = isGlobal ? 'Search everything…' : `Search ${moduleLabel}…`;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '220px', flexShrink: 0 }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', display: 'flex', alignItems: 'center',
        }}>
          <MagnifyingGlass size={14} weight="bold" color={T.text2} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={e => { e.target.style.borderColor = T.accent; if (query.length >= 2) setOpen(true); }}
          onBlur={e => { e.target.style.borderColor = T.border; }}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '28px',
            background: T.bg2,
            border: `0.5px solid ${T.border}`,
            borderRadius: '5px',
            padding: '4px 28px 4px 28px',
            color: T.text0,
            fontSize: F.sm,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {query.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', color: T.text2,
              cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '2px 4px',
            }}
          >×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999,
          width: 'min(360px, calc(100vw - 24px))',
          maxHeight: '480px', overflowY: 'auto', overflowX: 'hidden',
          background: T.bg1,
          border: `0.5px solid ${T.border}`,
          borderRadius: '6px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {loading ? (
            <div style={{ padding: '12px', textAlign: 'center', color: T.text2, fontSize: F.sm }}>
              Searching…
            </div>
          ) : results.length === 0 ? (
            <>
              <div style={{ padding: '12px', textAlign: 'center', color: T.text2, fontSize: F.sm }}>
                No results for &ldquo;{query}&rdquo;
              </div>
              {!isGlobal && (
                <div
                  onClick={() => setForceGlobal(true)}
                  style={{ padding: '8px 12px', color: T.accent, fontSize: F.xs, cursor: 'pointer', borderTop: `0.5px solid ${T.border}` }}
                >
                  Search all modules →
                </div>
              )}
            </>
          ) : isGlobal ? (
            // Global mode — grouped with section headers
            results.map((group, gi) => (
              <div key={group.module}>
                {gi > 0 && <div style={{ height: '0.5px', background: T.border }} />}
                <div style={{
                  fontSize: '10px', color: T.text3, textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '8px 12px 4px', userSelect: 'none',
                }}>
                  {group.label}
                </div>
                {group.items.map((item, ii) => (
                  <ResultRow key={ii} item={item} onClick={handleResultClick} />
                ))}
              </div>
            ))
          ) : (
            // Context mode — flat list + "Search all" link
            <>
              {results.flatMap(g => g.items).map((item, ii) => (
                <ResultRow key={ii} item={item} onClick={handleResultClick} />
              ))}
              <div
                onClick={() => setForceGlobal(true)}
                style={{ padding: '8px 12px', color: T.accent, fontSize: F.xs, cursor: 'pointer', borderTop: `0.5px solid ${T.border}` }}
              >
                Search all modules →
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({ item, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={item.url}
      onClick={e => onClick(e, item.url)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: item.subLine ? 'flex-start' : 'center', gap: '8px',
        padding: '7px 12px',
        textDecoration: 'none',
        color: T.text0,
        fontSize: F.sm,
        cursor: 'pointer',
        background: hovered ? T.bg3 : 'transparent',
      }}
    >
      <span style={{
        fontSize: '10px', color: '#fff', background: item.badgeColor,
        borderRadius: '3px', padding: '1px 5px', flexShrink: 0,
        fontWeight: 600, whiteSpace: 'nowrap',
        marginTop: item.subLine ? '1px' : '0',
      }}>
        {item.badge}
      </span>
      {item.subLine ? (
        <div style={{display:'flex',flexDirection:'column',gap:'2px',flex:1,overflow:'hidden'}}>
          <span style={{color:T.text0,fontSize:F.sm,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.display}</span>
          <span style={{color:T.text2,fontSize:F.xs,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.subLine}</span>
        </div>
      ) : (
        <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {item.display}
        </span>
      )}
    </a>
  );
}
