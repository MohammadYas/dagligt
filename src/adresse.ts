// Adresseopslag via Photon (OpenStreetMap). Offentligt, ingen noegle.
// Erstatter DAWA, som nu svarer 403 "RBAC: access denied".
const BASIS = 'https://photon.komoot.io/api/';

/** Slagelse Kommunes postnumre: Slagelse, Korsoer, Skaelskoer og landsbyerne imellem. */
const SLAGELSE_POSTNUMRE = ['4200', '4220', '4230', '4241', '4242', '4243', '4244', '4245', '4261', '4262'];

export type Forslag = {
  /** Hele adressen som den skal staa paa listen. */
  tekst: string;
  /** Vej og husnummer alene — det man kender doeren paa. */
  kort: string;
  /** Etage og doer. Photon kender dem ikke, saa altid null. */
  detalje: string | null;
  /** Landsbyen eller bydelen, naar den findes. */
  bynavn: string | null;
  /** Postnummer og by. */
  post: string;
  /** Sandt naar adressen ligger uden for Slagelse Kommune. */
  udenbys: boolean;
  lon: number;
  lat: number;
};

type Feature = {
  properties?: { street?: string; housenumber?: string; postcode?: string; city?: string; locality?: string; district?: string; countrycode?: string };
  geometry?: { coordinates?: [number, number] };
};

function byg(f: Feature): Forslag | null {
  const p = f.properties ?? {};
  const [lon, lat] = f.geometry?.coordinates ?? [];
  if (p.countrycode !== 'DK' || !p.street || !p.housenumber) return null;
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  const kort = `${p.street} ${p.housenumber}`;
  const bynavn = p.locality ?? p.district ?? null;
  const post = [p.postcode, p.city].filter(Boolean).join(' ');
  return {
    tekst: [kort, bynavn, post].filter(Boolean).join(', '),
    kort,
    detalje: null,
    bynavn,
    post,
    udenbys: !SLAGELSE_POSTNUMRE.includes(p.postcode ?? ''),
    lon,
    lat,
  };
}

/** Slaar adresser op mens der skrives, vaegtet mod Slagelse-omraadet. */
export async function soeg(q: string, signal?: AbortSignal): Promise<Forslag[]> {
  const raa = q.trim();
  if (raa.length < 2) return [];
  const url = `${BASIS}?q=${encodeURIComponent(raa)}&lat=55.40&lon=11.35&limit=12&lang=default`;
  const svar = await fetch(url, { signal });
  if (!svar.ok) throw new Error('Adressesøgningen svarer ikke lige nu.');
  const j = (await svar.json()) as { features?: Feature[] };
  const ud: Forslag[] = [];
  const set = new Set<string>();
  for (const f of j.features ?? []) {
    const forslag = byg(f);
    if (!forslag || set.has(forslag.tekst)) continue;
    set.add(forslag.tekst);
    ud.push(forslag);
  }
  return ud;
}
