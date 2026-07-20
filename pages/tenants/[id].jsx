import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, F, TenantDetail } from '../../components/TenantsView';
import { T } from '../../lib/theme';

export default function TenantDetailPage() {
  const router = useRouter();
  const [tenant,  setTenant]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    setError(null);
    let fetchPromise;
    if (id.includes('-')) {
      fetchPromise = sbFetch('tenants', `select=*&id=eq.${id}`);
    } else if (id.startsWith('X')) {
      const suffix = id.slice(1);
      fetchPromise = sbFetch('tenants', 'select=*').then(rows =>
        (rows || []).filter(t => t.id && t.id.slice(-6) === suffix)
      );
    } else {
      fetchPromise = sbFetch('tenants', `select=*&podio_id=eq.${id}`);
    }
    fetchPromise
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Tenant not found');
          setLoading(false);
          return;
        }
        setTenant(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    if (router.query.from === 'properties') {
      const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('tenantsBackUrl')) || '/properties';
      router.push(backUrl);
    } else {
      router.push('/tenants');
    }
  };

  return (
    <AppShell activeView={router.query.from === 'properties' ? 'properties' : 'tenants'}>
      <div style={{height:'100%', overflow:'hidden', background:T.bg1}}>
        {loading && (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:T.text3, fontSize:F.sm}}>
            Loading tenant…
          </div>
        )}
        {error && (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'12px'}}>
            <div style={{color:T.danger, fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/tenants')}
              style={{background:'transparent', border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'6px 16px', color:T.text1, fontSize:F.sm, cursor:'pointer'}}>
              ← Back to Tenants
            </button>
          </div>
        )}
        {tenant && (
          <TenantDetail
            key={tenant.id}
            tenant={tenant}
            onBack={handleBack}
            onUpdate={updated => setTenant(updated)}
          />
        )}
      </div>
    </AppShell>
  );
}
