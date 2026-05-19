import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, T, F, VendorDetail } from '../../components/VendorsView';

export default function VendorDetailPage() {
  const router = useRouter();
  const [vendor,  setVendor]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    setError(null);
    const filter = id.includes('-') ? `id=eq.${id}` : `podio_id=eq.${id}`;
    sbFetch('vendors', `select=*&${filter}`)
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Vendor not found');
          setLoading(false);
          return;
        }
        setVendor(data[0]);
        document.title = `${data[0].company_dba || 'Vendor'} | SedonaCRM`;
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => router.push('/vendors');

  return (
    <AppShell activeView="vendors">
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading vendor…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/vendors')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Vendors
            </button>
          </div>
        )}
        {vendor && <VendorDetail key={vendor.id} vendor={vendor} onBack={handleBack}/>}
      </div>
    </AppShell>
  );
}
