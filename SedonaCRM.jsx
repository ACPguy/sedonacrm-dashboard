import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://edxcvyleielzevpappui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw';

const SedonaCRM = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('morning-briefing');
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMenu, setExpandedMenu] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*&status=eq.active`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const data = await response.json();
        setProperties(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  const urgentItems = [
    { id: 1, type: 'Lease Expiration', property: '777 Oak Street', status: 'overdue', date: '2026-05-11' },
    { id: 2, type: 'Insurance Cert', property: 'FOX Commons', status: 'today', date: '2026-05-13' },
    { id: 3, type: 'CAM Reconciliation', property: 'CVP Plaza', status: 'week', date: '2026-05-16' },
    { id: 4, type: 'Rent Payment Due', property: 'RHS Plaza', status: 'future', date: '2026-05-20' },
    { id: 5, type: 'Move-Out Inspection', property: 'DCP Office', status: 'future', date: '2026-05-27' },
  ];

  const getUrgencyColor = (status) => {
    switch(status) {
      case 'overdue': return { bg: '#FCEBEB', text: '#791F1F', border: '#E24B4A', label: 'Overdue' };
      case 'today':   return { bg: '#FFF1E6', text: '#854F0B', border: '#BA7517', label: 'Due today' };
      case 'week':    return { bg: '#FFEDC1', text: '#854F0B', border: '#EF9F27', label: 'This week' };
      case 'future':  return { bg: '#E6F1FB', text: '#0C447C', border: '#378ADD', label: 'Future' };
      default:        return { bg: '#F1EFE8', text: '#444441', border: '#888780', label: 'Scheduled' };
    }
  };

  const NavItem = ({ icon, label, submenu, onClick, active }) => (
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => submenu ? setExpandedMenu(expandedMenu === label ? null : label) : onClick?.()}
        style={{
          width: '100%', padding: '10px 12px',
          background: active ? 'var(--color-background-secondary)' : 'transparent',
          border: 'none', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '14px', color: 'var(--color-text-primary)',
          borderRadius: 'var(--border-radius-md)',
          fontWeight: active ? '500' : '400',
        }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: '18px' }} aria-hidden="true"></i>
        <span style={{ flex: 1 }}>{label}</span>
        {submenu && (
          <i className="ti ti-chevron-down" style={{
            fontSize: '16px',
            transform: expandedMenu === label ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 200ms'
          }} aria-hidden="true"></i>
        )}
      </button>
      {submenu && expandedMenu === label && (
        <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
          {submenu.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.view); setExpandedMenu(null); }}
              style={{
                width: '100%', padding: '8px 12px',
                background: 'transparent', border: 'none',
                textAlign: 'left', cursor: 'pointer',
                fontSize: '13px', color: 'var(--color-text-secondary)',
                borderRadius: 'var(--border-radius-md)', marginBottom: '2px',
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--color-background-secondary)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const MorningBriefing = () => (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '500', margin: '0 0 8px' }}>Good morning, Scott</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          May 13, 2026 · {loading ? '—' : properties.length} active properties
        </p>
      </div>

      <h2 style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 16px' }}>Urgent items requiring attention</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '3rem' }}>
        {urgentItems.map((item) => {
          const c = getUrgencyColor(item.status);
          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '12px 16px', background: c.bg,
              border: `1px solid ${c.border}`, borderRadius: 'var(--border-radius-md)',
              cursor: 'pointer',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: c.border, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="ti ti-alert-circle" style={{ fontSize: '20px', color: 'white' }} aria-hidden="true"></i>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px', color: c.text }}>{item.type}</p>
                <p style={{ fontSize: '13px', color: c.text, margin: 0, opacity: 0.8 }}>{item.property} · {item.date}</p>
              </div>
              <span style={{
                padding: '4px 8px', background: c.border, color: 'white',
                fontSize: '11px', fontWeight: '500', borderRadius: '4px', whiteSpace: 'nowrap',
              }}>{c.label}</span>
              <i className="ti ti-external-link" style={{ fontSize: '16px', color: c.text }} aria-hidden="true"></i>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 16px' }}>Portfolio snapshot</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Active properties', value: loading ? '—' : properties.length },
          { label: 'Total suites', value: 177 },
          { label: 'Tenants', value: 312 },
          { label: 'Open work orders', value: 48 },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--color-background-secondary)',
            padding: '16px', borderRadius: 'var(--border-radius-md)', textAlign: 'center',
          }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>{stat.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '500', margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const PropertiesList = () => (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 20px' }}>Properties</h1>
      {loading ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading properties...</p>
      ) : error ? (
        <div style={{ padding: '16px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#791F1F' }}>Error: {error}</p>
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>Check Supabase RLS policies for anon role.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {properties.map((prop) => (
            <div
              key={prop.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 16px', background: 'var(--color-background-primary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 'var(--border-radius-md)', cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-background-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-background-primary)'}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--border-radius-md)',
                background: 'var(--color-background-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="ti ti-building" style={{ fontSize: '20px' }} aria-hidden="true"></i>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>{prop.name || prop.prop_code}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>{prop.city}, {prop.state}</p>
              </div>
              <i className="ti ti-external-link" style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }} aria-hidden="true"></i>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const StubView = ({ title, note }) => (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 16px' }}>{title}</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{note}</p>
    </div>
  );

  const renderView = () => {
    switch(currentView) {
      case 'morning-briefing':    return <MorningBriefing />;
      case 'properties':          return <PropertiesList />;
      case 'tenants':             return <StubView title="Tenants" note="Tenant list and detail view — coming soon." />;
      case 'leasing':             return <StubView title="Leasing pipeline" note="Leasing pipeline and stage tracking — coming soon." />;
      case 'work-orders':         return <StubView title="Work orders & issues" note="Work order tracking and issue management — coming soon." />;
      case 'tnt-cois':            return <StubView title="Tenant COIs" note="Tenant certificate of insurance expiration tracking — coming soon." />;
      case 'property-insurance':  return <StubView title="Property insurance" note="Property insurance and certificate management — coming soon." />;
      case 'suites':              return <StubView title="Suites" note="Suite-level details and lease information — coming soon." />;
      default:                    return <MorningBriefing />;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-tertiary)', fontFamily: 'var(--font-sans)' }}>

      <div style={{
        width: sidebarOpen ? '260px' : '0',
        background: 'var(--color-background-primary)',
        borderRight: '0.5px solid var(--color-border-tertiary)',
        transition: 'width 250ms ease',
        overflow: 'hidden', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', minWidth: '260px' }}>
          <p style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 12px', letterSpacing: '0.5px' }}>SedonaCRM</p>
          <NavItem icon="ti-home" label="Morning briefing" active={currentView === 'morning-briefing'} onClick={() => setCurrentView('morning-briefing')} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', minWidth: '260px' }}>
          <p style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '0 0 8px', letterSpacing: '0.5px', paddingLeft: '4px' }}>Operations</p>
          <NavItem icon="ti-building"   label="Properties"           active={currentView === 'properties'}   onClick={() => setCurrentView('properties')} />
          <NavItem icon="ti-user-group" label="Tenants"              active={currentView === 'tenants'}      onClick={() => setCurrentView('tenants')} />
          <NavItem icon="ti-file-text"  label="Leasing"              active={currentView === 'leasing'}      onClick={() => setCurrentView('leasing')} />
          <NavItem icon="ti-hammer"     label="Work orders & Issues" active={currentView === 'work-orders'}  onClick={() => setCurrentView('work-orders')} />

          <p style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', margin: '16px 0 8px', letterSpacing: '0.5px', paddingLeft: '4px' }}>Compliance</p>
          <NavItem icon="ti-shield" label="Insurance" submenu={[
            { id: 'tnt-cois', label: 'Tenant COIs', view: 'tnt-cois' },
            { id: 'prop-ins', label: 'Property insurance', view: 'property-insurance' },
          ]} />
          <NavItem icon="ti-door" label="Suites" active={currentView === 'suites'} onClick={() => setCurrentView('suites')} />
        </div>

        <div style={{ padding: '12px', borderTop: '0.5px solid var(--color-border-tertiary)', minWidth: '260px' }}>
          <NavItem icon="ti-user"     label="Account" />
          <NavItem icon="ti-settings" label="Settings" />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          padding: '12px 20px', background: 'var(--color-background-primary)',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', fontSize: '20px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center' }}
            aria-label="Toggle sidebar"
          >
            <i className="ti ti-menu-2" aria-hidden="true"></i>
          </button>
          <p style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)', margin: 0 }}>Anderson Commercial Properties</p>
          <button style={{
            background: 'var(--color-background-secondary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            padding: '6px 12px', cursor: 'pointer',
            fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)',
          }}>
            <i className="ti ti-user" style={{ marginRight: '6px' }} aria-hidden="true"></i>Scott
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default SedonaCRM;
