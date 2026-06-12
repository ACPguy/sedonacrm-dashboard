import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import AppShell from '../../components/AppShell';
import { TaskDetail } from '../../components/TasksView';

function NavDebugOverlay() {
  const router = useRouter();
  const [info, setInfo] = useState({ histLen: 0, asPath: '', locPath: '' });
  const [events, setEvents] = useState([]);
  const [popstates, setPopstates] = useState([]);

  const addEvent = (label, url) => {
    setEvents(prev => [{ label, url, t: new Date().toISOString().slice(11,23) }, ...prev].slice(0,3));
  };

  useEffect(() => {
    const tick = () => setInfo({
      histLen: window.history.length,
      asPath: router.asPath,
      locPath: window.location.pathname + window.location.search,
    });
    tick();
    const id = setInterval(tick, 300);

    const onStart = url => addEvent('routeChangeStart', url);
    const onDone  = url => addEvent('routeChangeComplete', url);
    router.events.on('routeChangeStart', onStart);
    router.events.on('routeChangeComplete', onDone);

    const onPop = () => {
      const loc = window.location.pathname + window.location.search;
      setPopstates(prev => [`${new Date().toISOString().slice(11,23)} popstate → ${loc}`, ...prev].slice(0,3));
    };
    window.addEventListener('popstate', onPop);

    return () => {
      clearInterval(id);
      router.events.off('routeChangeStart', onStart);
      router.events.off('routeChangeComplete', onDone);
      window.removeEventListener('popstate', onPop);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const box = {
    position:'fixed', bottom:'12px', left:'12px', zIndex:9999,
    background:'rgba(0,0,0,0.82)', color:'#a0ffb0', fontFamily:'monospace',
    fontSize:'11px', padding:'10px 14px', borderRadius:'6px',
    maxWidth:'360px', lineHeight:'1.55', pointerEvents:'none',
    border:'1px solid #2a4a2a',
  };
  const dim = { color:'#607060' };
  const hi  = { color:'#ffdd88' };

  return (
    <div style={box}>
      <div style={{color:'#50cc70',fontWeight:'bold',marginBottom:'4px'}}>▶ NAV DEBUG</div>
      <div><span style={dim}>history.length </span><span style={hi}>{info.histLen}</span></div>
      <div><span style={dim}>router.asPath  </span><span style={hi}>{info.asPath}</span></div>
      <div><span style={dim}>location       </span><span style={hi}>{info.locPath}</span></div>
      {events.length > 0 && (
        <>
          <div style={{...dim, marginTop:'5px'}}>── router events ──</div>
          {events.map((e,i) => (
            <div key={i}><span style={dim}>{e.t} </span>{e.label}<br/>
              <span style={{paddingLeft:'12px',color:'#88ccff'}}>{e.url}</span></div>
          ))}
        </>
      )}
      {popstates.length > 0 && (
        <>
          <div style={{...dim, marginTop:'5px'}}>── popstate ──</div>
          {popstates.map((p,i) => <div key={i} style={{color:'#ff9988'}}>{p}</div>)}
        </>
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  if (!id) return null;
  const debug = process.env.NEXT_PUBLIC_DEBUG_NAV === '1';
  return (
    <AppShell activeView="tasks">
      {debug && <NavDebugOverlay />}
      <TaskDetail
        prefixedId={id}
        onBack={() => {
          const back = typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('tasksBackUrl')
            : null;
          router.push(back || '/tasks');
        }}
      />
    </AppShell>
  );
}
