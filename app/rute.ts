import { useCallback, useEffect, useState } from 'react';

export type Skaerm = 'hjem' | 'dage' | 'arbejdspladser' | 'indstillinger' | 'loen' | 'rute';

const SKAERME: Skaerm[] = ['hjem', 'dage', 'arbejdspladser', 'indstillinger', 'loen', 'rute'];
// Adresser fra den forrige app, saa gamle genveje stadig rammer rigtigt.
const GAMLE: Record<string, Skaerm> = { vagter: 'hjem', oensker: 'dage', bureauer: 'arbejdspladser', lon: 'loen', par: 'hjem' };

export function fraHash(hash: string): Skaerm {
  const navn = hash.replace(/^#/, '');
  if ((SKAERME as string[]).includes(navn)) return navn as Skaerm;
  return GAMLE[navn] ?? 'hjem';
}

export function useSkaerm(): [Skaerm, (s: Skaerm) => void] {
  const [skaerm, setSkaerm] = useState<Skaerm>(() => fraHash(window.location.hash));
  useEffect(() => {
    const skift = () => setSkaerm(fraHash(window.location.hash));
    window.addEventListener('hashchange', skift);
    return () => window.removeEventListener('hashchange', skift);
  }, []);
  const gaa = useCallback((s: Skaerm) => {
    setSkaerm(s);
    if (window.location.hash !== '#' + s) window.location.hash = s;
  }, []);
  return [skaerm, gaa];
}
