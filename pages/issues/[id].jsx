import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, F, IssueDetail } from '../../components/IssuesView';
import { T } from '../../lib/theme';

export default function IssueDetailPage() {
  const router = useRouter();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    const filter = id.includes('-') ? `id=eq.${id}` : `podio_id=eq.${id}`;
    sbFetch('issues', `${filter}&select=*`)
      .then(data => {
        if (data.length === 0) { setError('Issue not found'); setLoading(false); return; }
        setIssue(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    if (router.query.from === 'properties') {
      const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('issuesBackUrl')) || '/properties';
      router.push(backUrl);
    } else {
      router.push('/issues');
    }
  };

  return (
    <AppShell activeView={router.query.from === 'properties' ? 'properties' : 'issues'}>
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading issue…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={()=>router.push('/issues')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Issues
            </button>
          </div>
        )}
        {issue && (
          <IssueDetail
            key={issue.id}
            issue={issue}
            onBack={handleBack}
            onUpdate={updated => setIssue(updated)}
          />
        )}
      </div>
    </AppShell>
  );
}
