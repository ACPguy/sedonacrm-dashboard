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

  useEffect(() => {
    fetch('/api/auth/gmail/status')
      .then(r => r.json())
      .then(setGmailStatus)
      .catch(() => setGmailStatus({ connected: false }));
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
