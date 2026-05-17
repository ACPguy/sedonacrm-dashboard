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
    sbFetch('property_owners', `select=*&id=eq.${id}`)
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

  const handleBack = () => router.push('/owners');

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
        {owner && <OwnerDetail key={owner.id} owner={owner} onBack={handleBack}/>}
      </div>
    </AppShell>
  );
}
