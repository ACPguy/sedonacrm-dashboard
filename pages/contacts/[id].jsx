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
      fetchPromise = sbFetch('contacts', 'select=*').then(rows =>
        (rows || []).filter(c => c.id && c.id.slice(-6) === suffix)
      );
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
