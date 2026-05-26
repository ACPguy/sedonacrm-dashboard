import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, T, F, OwnerDetail } from '../../components/OwnersView';

export default function OwnerDetailPage() {
  const router = useRouter();
  const [owner,   setOwner]   = useState(null);
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
      // UUID fallback
      fetchPromise = sbFetch('property_owners', `select=*&id=eq.${id}`);
    } else if (id.startsWith('X')) {
      // X-prefix: property_owners have 0 podio_ids — match by last 6 chars of UUID
      const suffix = id.slice(1);
      fetchPromise = sbFetch('property_owners', `select=*`).then(rows =>
        (rows || []).filter(o => o.id && o.id.slice(-6) === suffix)
      );
    } else {
      fetchPromise = sbFetch('property_owners', `select=*&podio_id=eq.${id}`);
    }

    fetchPromise
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Owner not found');
          setLoading(false);
          return;
        }
        setOwner(data[0]);
        document.title = `${data[0].company_dba || 'Owner'} | SedonaCRM`;
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('ownersBackUrl')) || '/owners';
    router.push(backUrl);
  };

  return (
    <AppShell activeView="owners">
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading owner…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/owners')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Owners
            </button>
          </div>
        )}
        {owner && (
          <OwnerDetail
            key={owner.id}
            owner={owner}
            onBack={handleBack}
            onUpdate={updated => setOwner(updated)}
          />
        )}
      </div>
    </AppShell>
  );
}
