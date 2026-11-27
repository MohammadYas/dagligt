import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { adgangsHeader, erWeb } from '../../adgang';
import { Action, Group, Notice } from '../ArbejdeUI';
const KEY = 'BKmvDla7PtqzEEOyw72demraYLGOnQJfM2Q-XetL4jWd92lPoyfAg6Gj1qXisCBFG6gqfcBipPC0uZnG_RcjMlk';
async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.active) throw new Error('Varsler kræver appen på din hjemmeskærm. Åbn den installerede app, og prøv igen.');
  return reg;
}
async function send(method: string, body?: object) {
  const r = await fetch('/api/push', { method, signal: AbortSignal.timeout(25000), headers: { ...adgangsHeader(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Kunne ikke gemme varsler. Prøv igen.');
}
export default function Varsler() {
  const [on, setOn] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const supported = erWeb && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  useEffect(() => {
    if (!supported) return;
    let current = true;
    setBusy(true);
    (async () => {
      // Reconcile an already permitted subscription; never ask for permission on launch.
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      await send('POST', sub.toJSON());
      if (current) setOn(true);
    })().catch(() => { if (current) setError('Kunne ikke bekræfte varsler. Tryk Slå varsler til for at prøve igen.'); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, []);
  async function change() {
    setBusy(true); setError('');
    try {
      if (!on && await Notification.requestPermission() !== 'granted') throw new Error('Tillad notifikationer i telefonens indstillinger for at få varsler.');
      const r = await registration();
      let sub = await r.pushManager.getSubscription();
      if (on) { await send('DELETE'); await sub?.unsubscribe(); setOn(false); }
      else {
        if (!sub) { const raw = atob(KEY.replace(/-/g, '+').replace(/_/g, '/')); sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) }); }
        await send('POST', sub.toJSON()); setOn(true);
      }
    } catch(e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Group title="Varsler fra CAS" help="Gælder denne telefon. Varsler ændres med det samme."><View style={{ padding: 16, gap: 8 }}>
    <Notice text={supported ? on ? 'Varsler er slået til. Du får besked, hvis CAS ikke har meldt sig i tre minutter.' : 'Få besked, hvis CAS ikke har meldt sig i tre minutter.' : 'Tilføj appen til hjemmeskærmen på din iPhone for at bruge varsler.'} />
    {supported && <Action label={on ? 'Slå varsler fra' : 'Slå varsler til'} busy={busy} onPress={change} />}
    {error && <Notice error text={error} />}
  </View></Group>;
}
