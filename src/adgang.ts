/**
 * Adgangskoden til mellemleddene.
 *
 * Den kommer ind én gang gennem adressens fragment (#n=…), som aldrig
 * sendes til serveren og ikke havner i logfiler. Derefter ligger den i
 * browserens lokale lager, og adressen ryddes, saa koden ikke staar i
 * adressefeltet naar du deler skaermen eller laegger genvejen paa
 * hjemmeskaermen.
 */
const NOEGLE = 'dagligapp.adgang';

export const erWeb = typeof document !== 'undefined';

/** Sandt naar siden er lagt paa hjemmeskaermen og aabnet derfra. */
export function erStandalone(): boolean {
  if (!erWeb) return false;
  try {
    const w = globalThis as any;
    if (w.navigator?.standalone === true) return true;
    return Boolean(w.matchMedia?.('(display-mode: standalone)')?.matches);
  } catch {
    return false;
  }
}

let kode: string | null = null;

if (erWeb) {
  try {
    const w = globalThis as any;
    const fragment: string = w.location?.hash ?? '';
    const fundet = /[#&]n=([^&]+)/.exec(fragment);

    if (fundet) {
      kode = decodeURIComponent(fundet[1]);
      w.localStorage?.setItem(NOEGLE, kode);
      // Adressen ryddes uden at genindlaese siden.
      w.history?.replaceState(null, '', w.location.pathname + w.location.search);
    } else {
      kode = w.localStorage?.getItem(NOEGLE) ?? null;
    }
  } catch {
    kode = null;
  }
}

export function harAdgang(): boolean {
  return !erWeb || Boolean(kode);
}

export function saetAdgang(ny: string) {
  kode = ny.trim();
  try {
    (globalThis as any).localStorage?.setItem(NOEGLE, kode);
  } catch {}
}

export function glemAdgang() {
  kode = null;
  try {
    (globalThis as any).localStorage?.removeItem(NOEGLE);
  } catch {}
}

/** Header til mellemleddene. Tom paa telefonen, hvor der ikke bruges proxy. */
export function adgangsHeader(): Record<string, string> {
  return kode ? { 'x-adgang': kode } : {};
}
