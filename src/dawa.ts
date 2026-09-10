// Danmarks Adressers Web API. Offentligt, ingen noegle.
const BASIS = 'https://api.dataforsyningen.dk';

export type Forslag = {
  /** Hele adressen som den skal staa paa listen. */
  tekst: string;
  /** Vej og husnummer alene — det man kender doeren paa. */
  kort: string;
  /** Etage og doer, naar adressen har dem. */
  detalje: string | null;
  lon: number;
  lat: number;
};

type DawaAdresse = {
  id?: string;
  vejnavn?: string;
  husnr?: string;
  etage?: string | null;
  'dør'?: string | null;
  supplerendebynavn?: string | null;
  postnr?: string;
  postnrnavn?: string;
  x?: number;
  y?: number;
};

function byg(a: DawaAdresse): Forslag | null {
  const lon = a.x;
  const lat = a.y;
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  if (!a.vejnavn || !a.husnr) return null;

  const kort = `${a.vejnavn} ${a.husnr}`;
  const dele = [a.etage ? `${a.etage}.` : null, a['dør'] ?? null].filter(Boolean);
  const detalje = dele.length ? dele.join(' ') : null;
  const by = [a.postnr, a.postnrnavn].filter(Boolean).join(' ');

  return {
    tekst: [kort, detalje, by].filter(Boolean).join(', '),
    kort,
    detalje,
    lon,
    lat,
  };
}

/**
 * Slaar adresser op mens der skrives. Etiketten bygges af DAWA's egne felter,
 * ikke af tekststrengen — den blander etage og husnummer sammen.
 */
export async function soeg(q: string, signal?: AbortSignal): Promise<Forslag[]> {
  const raa = q.trim();
  if (raa.length < 3) return [];

  const url = `${BASIS}/adresser/autocomplete?q=${encodeURIComponent(raa)}&per_side=10`;
  const svar = await fetch(url, { signal });
  if (!svar.ok) throw new Error(`Adresseopslag svarede ${svar.status}.`);

  const data = (await svar.json()) as { adresse?: DawaAdresse }[];
  const ud: Forslag[] = [];
  const set = new Set<string>();

  for (const r of data) {
    const f = r.adresse ? byg(r.adresse) : null;
    if (!f || set.has(f.tekst)) continue;
    set.add(f.tekst);
    ud.push(f);
  }

  return ud.slice(0, 8);
}
