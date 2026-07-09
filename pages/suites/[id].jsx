import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, F, SuiteDetail } from '../../components/SuitesView';
import { T } from '../../lib/theme';

export default function SuiteDetailPage() {
  const router = useRouter();
  const [suite,   setSuite]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    setError(null);
    const filter = id.includes('-') ? `id=eq.${id}` : `podio_id=eq.${id}`;
    sbFetch('suites', `select=*&${filter}`)
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Suite not found');
          setLoading(false);
          return;
        }
        setSuite(data[0]);
        document.title = `Suite ${data[0].suite_num || id} · ${data[0].prop_code || ''} | SedonaCRM`;
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    try {
      const back = sessionStorage.getItem('suitesBackUrl');
      if (back) { router.push(back); return; }
    } catch {}
    router.push('/suites');
  };

  return (
    <AppShell activeView="suites">
      <div style={{ height: '100%', overflow: 'hidden', background: T.bg1 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.text3, fontSize: F.sm }}>
            Loading suite…
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <div style={{ color: T.danger, fontSize: F.base }}>{error}</div>
            <button onClick={() => router.push('/suites')}
              style={{ background: 'transparent', border: `0.5px solid ${T.border}`, borderRadius: '4px', padding: '6px 16px', color: T.text1, fontSize: F.sm, cursor: 'pointer' }}>
              ← Back to Suites
            </button>
          </div>
        )}
        {suite && (
          <SuiteDetail
            key={suite.id}
            suite={suite}
            onBack={handleBack}
            onUpdate={updated => setSuite(updated)}
          />
        )}
      </div>
    </AppShell>
  );
}
