import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, T, F, WorkOrderDetail } from '../../components/WorkOrdersView';

export default function WorkOrderDetailPage() {
  const router = useRouter();
  const [wo, setWo]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    const filter = id.includes('-') ? `id=eq.${id}` : `podio_id=eq.${id}`;
    sbFetch('work_orders', `${filter}&select=*`)
      .then(data => {
        if (data.length === 0) { setError('Work order not found'); setLoading(false); return; }
        setWo(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('workOrdersBackUrl')) || '/work-orders';
    router.push(backUrl);
  };

  return (
    <AppShell activeView="work-orders">
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading work order…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/work-orders')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Work Orders
            </button>
          </div>
        )}
        {wo && (
          <WorkOrderDetail
            key={wo.id}
            wo={wo}
            onBack={handleBack}
          />
        )}
      </div>
    </AppShell>
  );
}
