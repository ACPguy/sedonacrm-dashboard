import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, F, ContactDetail } from '../../components/ContactsView';
import { T } from '../../lib/theme';

export default function ContactDetailPage() {
  const router = useRouter();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const { id } = router.query;
    if (!id) return;
    setLoading(true);
    setError(null);
    let fetchPromise;
    if (id.includes('-')) {
      fetchPromise = sbFetch('contacts', `select=*&id=eq.${id}`);
    } else if (id.startsWith('X')) {
      const suffix = id.slice(1);
      fetchPromise = fetch('https://edxcvyleielzevpappui.supabase.co/rest/v1/rpc/find_contact_by_id_suffix', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeGN2eWxlaWVsemV2cGFwcHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjU3MjMsImV4cCI6MjA5Mjc0MTcyM30.OYSzunKtdw88PkhMyI9GSIa8MyIZ2paTgZ-Mg_oS4Yw',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_suffix: suffix }),
      }).then(r => r.json());
    } else {
      fetchPromise = sbFetch('contacts', `select=*&podio_id=eq.${id}`);
    }
    fetchPromise
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          setError('Contact not found');
          setLoading(false);
          return;
        }
        setContact(data[0]);
        document.title = `${data[0].full_name || 'Contact'} | SedonaCRM`;
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    try {
      const back = sessionStorage.getItem('contactsBackUrl');
      if (back) { router.push(back); return; }
    } catch {}
    router.push('/contacts');
  };

  return (
    <AppShell activeView="contacts">
      <div style={{height:'100%',overflow:'hidden',background:T.bg1}}>
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:T.text3,fontSize:F.sm}}>
            Loading contact…
          </div>
        )}
        {error && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:'12px'}}>
            <div style={{color:T.danger,fontSize:F.base}}>{error}</div>
            <button onClick={() => router.push('/contacts')}
              style={{background:'transparent',border:`0.5px solid ${T.border}`,borderRadius:'4px',padding:'6px 16px',color:T.text1,fontSize:F.sm,cursor:'pointer'}}>
              ← Back to Contacts
            </button>
          </div>
        )}
        {contact && (
          <ContactDetail
            key={contact.id}
            contact={contact}
            onBack={handleBack}
          />
        )}
      </div>
    </AppShell>
  );
}
