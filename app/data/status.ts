import { useCallback, useEffect, useRef, useState } from 'react';
import { Fil, hentStatus } from '../../src/dropbox';
import { FILER } from '../../src/vagter';

const HVERT = 60_000;

/** CAS status file (read-only). Fetched on start, every minute and when the app comes back. */
export function useCasStatus(): { fil?: Fil; fejl?: string; henter: boolean; opdater(): void } {
  const [fil, setFil] = useState<Fil>();
  const [fejl, setFejl] = useState<string>();
  const [henter, setHenter] = useState(false);
  const igang = useRef(false);

  const opdater = useCallback(() => {
    if (igang.current) return;
    igang.current = true; setHenter(true);
    hentStatus(FILER.cas.status)
      .then(f => { setFil(f); setFejl(undefined); })
      .catch((e: unknown) => setFejl(e instanceof Error ? e.message : 'Status kunne ikke hentes.'))
      .finally(() => { igang.current = false; setHenter(false); });
  }, []);

  useEffect(() => {
    opdater();
    const t = setInterval(() => { if (document.visibilityState === 'visible') opdater(); }, HVERT);
    const synlig = () => { if (document.visibilityState === 'visible') opdater(); };
    document.addEventListener('visibilitychange', synlig);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', synlig); };
  }, [opdater]);

  return { fil, fejl, henter, opdater };
}
