import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, T, F, RentScheduleDetail } from '../../components/RentScheduleView';

export default function RentScheduleDetailPage() {
  const router = useRouter();
  const [row, setRow]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    const filter = id.includes('-') ? `id=eq.${id}` : `podio_id=eq.${id}`;
    sbFetch('rent_schedule',
      `${filter}&select=*,tenants!rent_schedule_tenant_id_fkey(tenant_dba,lease_type)`
    )
      .then(data => {
        if (data.length === 0) { setError('Record not found'); setLoading(false); return; }
        setRow(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('rentScheduleBackUrl')) || '/rent-schedule';
    router.push(backUrl);
  };

  return (
    <AppShell activeView="rent-schedule">
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading rent record…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/rent-schedule')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Rent Schedule
            </button>
          </div>
        )}
        {row && (
          <RentScheduleDetail
            key={row.id}
            row={row}
            onBack={handleBack}
          />
        )}
      </div>
    </AppShell>
  );
}
