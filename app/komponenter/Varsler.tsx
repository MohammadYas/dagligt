import { useEffect, useState } from 'react';
import { adgangsHeader } from '../../src/adgang';
import { Besked, Gruppe, Kontakt } from '../ui/kit';

// Same VAPID public key and /api/push calls as the old app.
const KEY = 'BKmvDla7PtqzEEOyw72demraYLGOnQJfM2Q-XetL4jWd92lPoyfAg6Gj1qXisCBFG6gqfcBipPC0uZnG_RcjMlk';

async function registrering(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) throw new Error('Varsler kræver appen på din hjemmeskærm. Åbn den installerede app, og prøv igen.');
  return reg;
}
async function send(method: string, body?: object) {
  const r = await fetch('/api/push', { method, signal: AbortSignal.timeout(25000), headers: { ...adgangsHeader(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Kunne ikke gemme varsler. Prøv igen.');
}

export default function Varsler() {
  const [til, setTil] = useState(false);
  const [optaget, setOptaget] = useState(false);
  const [fejl, setFejl] = useState('');
  const understoettet = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (!understoettet) return;
    let aktuel = true;
    setOptaget(true);
    (async () => {
      // Reconcile an already permitted subscription; never ask for permission on launch.
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      await send('POST', sub.toJSON());
      if (aktuel) setTil(true);
    })().catch(() => { if (aktuel) setFejl('Kunne ikke bekræfte varsler. Slå dem til igen for at prøve igen.'); })
      .finally(() => { if (aktuel) setOptaget(false); });
    return () => { aktuel = false; };
  }, [understoettet]);

  async function skift() {
    if (optaget) return;
    setOptaget(true); setFejl('');
    try {
      if (!til && await Notification.requestPermission() !== 'granted') throw new Error('Tillad notifikationer i telefonens indstillinger for at få varsler.');
      const r = await registrering();
      let sub = await r.pushManager.getSubscription();
      if (til) { await send('DELETE'); await sub?.unsubscribe(); setTil(false); }
      else {
        if (!sub) { const raa = atob(KEY.replace(/-/g, '+').replace(/_/g, '/')); sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raa, c => c.charCodeAt(0)) }); }
        await send('POST', sub.toJSON()); setTil(true);
      }
    } catch (e) { setFejl((e as Error).message); }
    finally { setOptaget(false); }
  }

  return (
    <Gruppe titel="Varsler" hjaelp="Du får besked, når CAS ikke har meldt sig i tre minutter, og når en vagt bliver taget. Gælder denne telefon.">
      {understoettet
        ? <Kontakt label="Varsler fra CAS" hjaelp={optaget ? 'Opdaterer…' : til ? 'Slået til' : 'Slået fra'} vaerdi={til} onSkift={() => void skift()} deaktiveret={optaget} />
        : <div className="raekke"><Besked tekst="Tilføj appen til hjemmeskærmen på din iPhone for at bruge varsler." /></div>}
      {fejl && <div className="raekke"><Besked tekst={fejl} fejl /></div>}
    </Gruppe>
  );
}
