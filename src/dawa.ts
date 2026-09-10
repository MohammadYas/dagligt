// Danmarks Adressers Web API. Offentligt, ingen noegle.
const BASIS = 'https://api.dataforsyningen.dk';

/**
 * Slagelse Kommune. Alle distrikterne — Slagelse, Korsoer, Skaelskoer og
 * landsbyerne imellem — ligger i den samme kommune, saa ét filter daekker
 * hele arbejdsomraadet. Uden det giver "Dalmose" adresser paa Fejoe og
 * "Rude" adresser i Holte.
 */
export const SLAGELSE = '0330';

export type Forslag = {
  /** Hele adressen som den skal staa paa listen. */
  tekst: string;
  /** Vej og husnummer alene — det man kender doeren paa. */
  kort: string;
  /** Etage og doer, naar adressen har dem. */
  detalje: string | null;
  /** Landsbyen, fx Havrebjerg eller Kirke Stillinge. Ofte det navn stedet kendes paa. */
  bynavn: string | null;
  /** Postnummer og postdistrikt. */
  post: string;
  /** Sandt naar adressen ligger uden for Slagelse Kommune. */
  udenbys: boolean;
  lon: number;
  lat: number;
};

type DawaAdresse = {
  vejnavn?: string;
  husnr?: string;
  etage?: string | null;
  'dør'?: string | null;
  supplerendebynavn?: string | null;
  postnr?: string;
  postnrnavn?: string;
  kommunekode?: string;
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
  const bynavn = a.supplerendebynavn ?? null;
  const post = [a.postnr, a.postnrnavn].filter(Boolean).join(' ');

  return {
    // Landsbynavnet med, praecis som DAWA selv skriver adressen.
    tekst: [kort, detalje, bynavn, post].filter(Boolean).join(', '),
    kort,
    detalje,
    bynavn,
    post,
    udenbys: a.kommunekode !== SLAGELSE,
    lon,
    lat,
  };
}

async function hent(
  q: string,
  kommune: string | null,
  antal: number,
  fuzzy: boolean,
  signal?: AbortSignal,
) {
  const url =
    `${BASIS}/adresser/autocomplete?q=${encodeURIComponent(q)}` +
    (kommune ? `&kommunekode=${kommune}` : '') +
    (fuzzy ? '&fuzzy=' : '') +
    `&per_side=${antal}`;

  const svar = await fetch(url, { signal });
  if (!svar.ok) throw new Error(`Adresseopslag svarede ${svar.status}.`);
  return (await svar.json()) as { adresse?: DawaAdresse }[];
}

/**
 * DAWA's adressevask. Den taaler mere rod end autocomplete — "Smedegde 32"
 * bliver til Smedegade — men svarer uden koordinater. Derfor bruges den kun
 * til at rette stavningen, hvorefter det rettede slaas op paa normal vis.
 */
async function vask(q: string, signal?: AbortSignal): Promise<string | null> {
  const url = `${BASIS}/datavask/adresser?betegnelse=${encodeURIComponent(q)}`;
  const svar = await fetch(url, { signal });
  if (!svar.ok) return null;

  const j = (await svar.json()) as {
    kategori?: string;
    resultater?: { adresse?: DawaAdresse }[];
  };
  const a = j.resultater?.[0]?.adresse;
  if (!a?.vejnavn || !a.husnr) return null;

  return [a.vejnavn + ' ' + a.husnr, a.postnr, a.postnrnavn].filter(Boolean).join(' ');
}

/**
 * Slaar adresser op mens der skrives. Slagelse Kommune kommer foerst;
 * resten af landet fyldes paa bagefter, saa en adresse uden for kommunen
 * stadig kan findes uden at fylde listen til hverdag.
 */
export async function soeg(q: string, signal?: AbortSignal): Promise<Forslag[]> {
  const raa = q.trim();
  if (raa.length < 2) return [];

  const ud: Forslag[] = [];
  const set = new Set<string>();

  function saml(raekker: { adresse?: DawaAdresse }[]) {
    for (const r of raekker) {
      const f = r.adresse ? byg(r.adresse) : null;
      if (!f || set.has(f.tekst)) continue;
      set.add(f.tekst);
      ud.push(f);
    }
  }

  // 1. Praecis skrivning i egen kommune.
  saml(await hent(raa, SLAGELSE, 20, false, signal));

  // 2. Samme kommune, men med plads til slaafejl.
  if (ud.length < 8) {
    try {
      saml(await hent(raa, SLAGELSE, 20, true, signal));
    } catch {}
  }

  // 3. Adressevask retter stavningen, og det rettede slaas op paa ny.
  if (ud.length === 0) {
    try {
      const rettet = await vask(raa, signal);
      if (rettet) saml(await hent(rettet, SLAGELSE, 10, true, signal));
    } catch {}
  }

  // 4. Foerst herefter resten af landet.
  if (ud.length === 0) {
    try {
      saml(await hent(raa, null, 12, true, signal));
    } catch {}
  }

  return ud.slice(0, 12);
}
