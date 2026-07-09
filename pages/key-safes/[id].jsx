import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, F, KeySafeDetail } from '../../components/KeySafesView';
import { T } from '../../lib/theme';

export default function KeySafeDetailPage() {
  const router = useRouter();
  const [item,    setItem]    = useState(null);
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
      fetchPromise = sbFetch('key_safes', `select=*&id=eq.${id}`);
    } else if (id.startsWith('X')) {
      const suffix = id.slice(1);
      fetchPromise = sbFetch('key_safes', `select=*`).then(rows =>
        (rows || []).filter(r => r.id && r.id.slice(-6) === suffix)
      );
    } else {
      fetchPromise = sbFetch('key_safes', `select=*&id=eq.${id}`);
    }

    fetchPromise
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Key safe not found');
          setLoading(false);
          return;
        }
        setItem(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('keySafesBackUrl')) || '/key-safes';
    router.push(backUrl);
  };

  return (
    <AppShell activeView="key-safes">
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading key safe…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/key-safes')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Key Safes
            </button>
          </div>
        )}
        {item && (
          <KeySafeDetail
            key={item.id}
            keySafe={item}
            onBack={handleBack}
            onUpdate={updated => setItem(updated)}
          />
        )}
      </div>
    </AppShell>
  );
}
