import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../components/AppShell';
import { sbFetch, T, F, ContactDetail } from '../../components/ContactsView';

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
    sbFetch('contacts', `id=eq.${id}&select=*`)
      .then(data => {
        if (data.length === 0) { setError('Contact not found'); setLoading(false); return; }
        setContact(data[0]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [router.isReady, router.query.id]);

  const handleBack = () => {
    const backUrl = (typeof window !== 'undefined' && sessionStorage.getItem('contactsBackUrl')) || '/contacts';
    router.push(backUrl);
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
