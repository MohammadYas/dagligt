import { useEffect, useSyncExternalStore } from 'react';
import { gemFil, hentFil } from '../../src/dropbox.web';
import { VagtSession } from '../../src/vagtsession';
import type { FilKey } from '../../src/vagtdata';

/** One session for the whole app; every screen edits the same drafts. */
export const session = new VagtSession(hentFil, gemFil);

// 'par' (/steder.txt) is not shown anywhere, so it is never loaded or written.
const VISTE: FilKey[] = ['kontrol', 'cas', 'torn', 'bureauer'];
export const indlaesAlt = () => { for (const k of VISTE) void session.load(k); };

let startet = false;
export function useSession(): VagtSession {
  useSyncExternalStore(session.subscribe, session.snapshot);
  useEffect(() => { if (!startet) { startet = true; indlaesAlt(); } }, []);
  return session;
}

/** Save pending edits when the app is hidden or closed; warn if leaving mid-edit. */
export function useGemVedForlad() {
  useEffect(() => {
    const gem = () => { if (session.dirtyKeys.length && !session.saving) void session.save(); };
    const synlighed = () => { if (document.visibilityState === 'hidden') gem(); };
    const advar = (e: BeforeUnloadEvent) => { if (session.dirtyKeys.length || session.saving) e.preventDefault(); };
    document.addEventListener('visibilitychange', synlighed);
    window.addEventListener('pagehide', gem);
    window.addEventListener('beforeunload', advar);
    return () => {
      document.removeEventListener('visibilitychange', synlighed);
      window.removeEventListener('pagehide', gem);
      window.removeEventListener('beforeunload', advar);
    };
  }, []);
}
