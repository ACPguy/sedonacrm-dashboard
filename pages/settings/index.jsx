import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Envelope, CheckCircle, Warning } from '@phosphor-icons/react';
import AppShell from '../../components/AppShell';

const T = {
  bg0: '#161920', bg1: '#1e2128', bg2: '#252930', bg3: '#2e3240',
  text0: '#c9cdd6', text1: '#8a95a8', text2: '#5a6272', text3: '#4a5264',
  accent: '#6e9fd8', border: '#2e3240',
  danger: '#e07070', warn: '#d4924a', success: '#6ab06a',
};
const F = { xs: '12px', sm: '13px', base: '14px', md: '15px', lg: '17px' };

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SettingsPage() {
  const router = useRouter();
  const [gmailStatus, setGmailStatus] = useState(null);
  const [banner, setBanner] = useState(null);
  const [automations, setAutomations] = useState(null);

  useEffect(() => {
    fetch('/api/auth/gmail/status')
      .then(r => r.json())
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false }));
  }, []);

  useEffect(() => {
    fetch('/api/settings/automations')
      .then(r => r.json())
      .then(setAutomations)
      .catch(() => setAutomations({ agents: [], triggers: [] }));
  }, []);

  useEffect(() => {
    const { gmail } = router.query;
    if (gmail === 'connected') {
      setBanner({ type: 'success', msg: 'Gmail connected successfully.' });
      const t = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(t);
    }
    if (gmail === 'error') {
      setBanner({ type: 'error', msg: 'Gmail connection failed. Please try again.' });
      const t = setTimeout(() => setBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, [router.query]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: T.bg1 }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 20px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: F.lg, fontWeight: '700', color: T.text0 }}>Settings</h1>
          <p style={{ fontSize: F.sm, color: T.text1, marginTop: '4px' }}>Manage integrations and account configuration.</p>
        </div>

        {/* Banner */}
        {banner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px', borderRadius: '6px', marginBottom: '20px',
            background: banner.type === 'success' ? 'rgba(106,176,106,0.12)' : 'rgba(224,112,112,0.12)',
            border: `1px solid ${banner.type === 'success' ? T.success : T.danger}`,
            color: banner.type === 'success' ? T.success : T.danger,
            fontSize: F.sm,
          }}>
            {banner.type === 'success'
              ? <CheckCircle size={18} weight="fill" />
              : <Warning size={18} weight="fill" />}
            {banner.msg}
          </div>
        )}

        {/* Automations Registry card */}
        <div style={{
          background: T.bg0, border: `0.5px solid ${T.border}`, borderRadius: '8px',
          padding: '20px 24px', marginBottom: '16px',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: F.md, fontWeight: '600', color: T.text0 }}>Automations Registry</span>
            <p style={{ fontSize: F.sm, color: T.text1, marginTop: '4px' }}>
              Every scheduled agent and workflow trigger running in SedonaCRM, in one place.
            </p>
          </div>

          {/* Agents subsection */}
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: F.xs, fontWeight: '600', color: T.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Scheduled Agents
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '8px' }}>
            {!automations ? (
              <span style={{ fontSize: F.sm, color: T.text2 }}>Loading…</span>
            ) : automations.agents.length === 0 ? (
              <span style={{ fontSize: F.sm, color: T.text2 }}>No agents registered.</span>
            ) : automations.agents.map(agent => (
              <div key={agent.id} style={{
                padding: '10px 12px', borderRadius: '6px', background: T.bg1,
                border: `0.5px solid ${T.border}`,
                marginBottom: '6px',
              }}>
                <div style={{ fontWeight: '600', fontSize: F.sm, color: T.text0 }}>{agent.name}</div>
                {agent.description && (
                  <div style={{ fontSize: F.sm, color: T.text1, marginTop: '2px', lineHeight: '1.5' }}>
                    {agent.description}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
                  {agent.cron_schedule && (
                    <span style={{ fontSize: F.xs, color: T.text2, fontFamily: 'monospace' }}>
                      cron: {agent.cron_schedule}
                    </span>
                  )}
                  {agent.code_location && (
                    <span style={{ fontSize: F.xs, color: T.text2, fontFamily: 'monospace' }}>
                      {agent.code_location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Triggers subsection */}
          <div style={{ marginTop: '16px', marginBottom: '4px' }}>
            <span style={{ fontSize: F.xs, fontWeight: '600', color: T.text2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Workflow Triggers
            </span>
          </div>
          <div style={{ marginTop: '8px' }}>
            {!automations ? (
              <span style={{ fontSize: F.sm, color: T.text2 }}>Loading…</span>
            ) : automations.triggers.length === 0 ? (
              <span style={{ fontSize: F.sm, color: T.text2 }}>
                No triggers registered yet — added as Work Order automations are built.
              </span>
            ) : automations.triggers.map(trigger => (
              <div key={trigger.id} style={{
                padding: '10px 12px', borderRadius: '6px', background: T.bg1,
                border: `0.5px solid ${T.border}`, marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', fontSize: F.sm, color: T.text0 }}>{trigger.name}</span>
                  <span style={{ fontSize: F.xs, color: T.text2 }}>{trigger.module}</span>
                  <span style={{
                    fontSize: F.xs, padding: '1px 6px', borderRadius: '10px',
                    background: trigger.status === 'active' ? 'rgba(106,176,106,0.12)' : 'rgba(90,98,114,0.2)',
                    color: trigger.status === 'active' ? T.success : T.text2,
                    border: `1px solid ${trigger.status === 'active' ? T.success : T.border}`,
                  }}>{trigger.status}</span>
                </div>
                {trigger.action_display && (
                  <div style={{ fontSize: F.sm, color: T.text1, marginTop: '2px' }}>{trigger.action_display}</div>
                )}
                {trigger.code_location && (
                  <div style={{ fontSize: F.xs, color: T.text2, fontFamily: 'monospace', marginTop: '4px' }}>
                    {trigger.code_location}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gmail Integration card */}
        <div style={{
          background: T.bg0, border: `0.5px solid ${T.border}`, borderRadius: '8px',
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              background: T.bg2, border: `0.5px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Envelope size={24} color="#E8630A" weight="bold" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: F.md, fontWeight: '600', color: T.text0 }}>Gmail Integration</span>
                {gmailStatus?.connected && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: F.xs, fontWeight: '600', color: T.success,
                    background: 'rgba(106,176,106,0.12)', border: `1px solid ${T.success}`,
                    padding: '2px 8px', borderRadius: '12px',
                  }}>
                    <CheckCircle size={12} weight="fill" /> Connected
                  </span>
                )}
              </div>

              <p style={{ fontSize: F.sm, color: T.text1, marginTop: '6px', lineHeight: '1.5' }}>
                Connect Scott&apos;s Gmail account to enable two-way email threading. Emails sent from SedonaCRM will
                appear in Gmail Sent. Replies from Gmail will be logged to CRM records automatically.
              </p>

              {gmailStatus?.connected && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: F.sm, color: T.text0 }}>{gmailStatus.email}</span>
                  <span style={{ fontSize: F.xs, color: T.text2 }}>
                    Last connected: {fmtDate(gmailStatus.lastUpdated)}
                  </span>
                </div>
              )}

              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!gmailStatus?.connected ? (
                  <a
                    href="/api/auth/gmail/connect"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '7px 16px', borderRadius: '5px', fontSize: F.sm, fontWeight: '600',
                      background: T.accent, color: '#fff', textDecoration: 'none', cursor: 'pointer',
                      border: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    Connect Gmail
                  </a>
                ) : (
                  <a
                    href="/api/auth/gmail/connect"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px', borderRadius: '5px', fontSize: F.sm, fontWeight: '500',
                      background: T.bg3, color: T.text1, textDecoration: 'none', cursor: 'pointer',
                      border: `1px solid ${T.border}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.text0; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.text1; }}>
                    Reconnect
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SettingsPageRoute() {
  return (
    <AppShell activeView="settings">
      <SettingsPage />
    </AppShell>
  );
}
