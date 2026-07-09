import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, F, PropertyDetail } from '../../components/SedonaCRM';
import { T } from '../../lib/theme';

export default function PropertyDetailPage() {
  const router = useRouter();
  const [property, setProperty] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    setError(null);
    let filter;
    if (id.includes('-')) filter = `id=eq.${id}`;
    else if (/^\d+$/.test(id)) filter = `podio_id=eq.${id}`;
    else filter = `prop_code=eq.${id}`;
    sbFetch('properties', `select=*&${filter}`)
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Property not found');
          setLoading(false);
          return;
        }
        setProperty(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('propertiesBackUrl')) || '/properties';
    router.push(backUrl);
  };

  return (
    <AppShell activeView="properties">
      <div style={{height:'100%', overflow:'hidden', background:T.bg1}}>
        {loading && (
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:T.text3, fontSize:F.sm}}>
            Loading property…
          </div>
        )}
        {error && (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'12px'}}>
            <div style={{color:T.danger, fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/properties')}
              style={{background:'transparent', border:`0.5px solid ${T.border}`, borderRadius:'4px', padding:'6px 16px', color:T.text1, fontSize:F.sm, cursor:'pointer'}}>
              ← Back to Properties
            </button>
          </div>
        )}
        {property && (
          <PropertyDetail
            key={property.id}
            property={property}
            onBack={handleBack}
            onUpdate={updated => setProperty(updated)}
            initialTab={router.query.tab}
          />
        )}
      </div>
    </AppShell>
  );
}
