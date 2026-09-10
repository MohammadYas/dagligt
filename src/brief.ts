import { DB, dayKey, longDate, greeting, streak } from './store';
import { hentFil, hentStatus } from './dropbox';
import { FILER, parseOensker, parseStatus, tilstand, Script } from './vagter';

import { spoerg } from './ai';

export type Kilder = {
  dato: string;
  hilsen: string;
  opgaverAabne: string[];
  opgaverKlaret: number;
  streak: number;
  indbakke: number;
  scripts: { navn: string; tilstand: string; ledige: number | null; matcher: number | null }[];
  vagtIDag: boolean;
  naesteVagt: string | null;
};

/** Samler alt appen ved lige nu. Fejler et opslag, udelades det bare. */
export async function saml(db: DB): Promise<Kilder> {
  const iDag = dayKey();

  const scripts: Kilder['scripts'] = [];
  let vagtIDag = false;
  let naesteVagt: string | null = null;

  for (const sc of ['cas', 'torn'] as Script[]) {
    try {
      const f = await hentStatus(FILER[sc].status);
      const s = parseStatus(f.tekst, f.skrevet);
      scripts.push({
        navn: FILER[sc].navn,
        tilstand: tilstand(s),
        ledige: s.ledige,
        matcher: s.matcher,
      });
    } catch {
      // Uden net melder vi bare ikke om det script.
    }
  }

  try {
    const o = parseOensker(await hentFil(FILER.cas.oensker));
    vagtIDag = o.datoer.includes(iDag);
    naesteVagt = o.datoer.find((d) => d > iDag) ?? null;
  } catch {
    // Ingen oensker at melde om.
  }

  const opgaver = db.tasks.filter((t) => t.date === iDag);

  return {
    dato: longDate(),
    hilsen: greeting(),
    opgaverAabne: opgaver.filter((t) => !t.done).map((t) => t.text),
    opgaverKlaret: opgaver.filter((t) => t.done).length,
    streak: streak(db.logs),
    indbakke: db.captures.length,
    scripts,
    vagtIDag,
    naesteVagt,
  };
}

const SYSTEM = [
  'Du skriver en kort morgenbesked på dansk, som bliver læst højt.',
  'Højst fem sætninger. Ingen overskrift, ingen punktopstilling, ingen emojis.',
  'Du opfinder intet. Nævn kun det der står i dataene.',
  'Begynd med hilsenen og datoen. Nævn derefter kun det der er værd at vide:',
  'et script der ikke kører, vagter der matcher, opgaver der mangler.',
  'Er alt roligt, så sig det kort i stedet for at opremse.',
  'Tal til personen som en kollega der lige har set på tingene. Ingen løfter, ingen opsang.',
].join(' ');

/** Beder DeepSeek skrive dagens besked ud fra kilderne. */
export async function skrivBrief(k: Kilder): Promise<string> {
  const data = {
    hilsen: k.hilsen,
    dato: k.dato,
    vagt_i_dag: k.vagtIDag,
    naeste_oenskede_vagtdag: k.naesteVagt,
    scripts: k.scripts,
    opgaver_mangler: k.opgaverAabne,
    opgaver_klaret: k.opgaverKlaret,
    dage_i_traek_logget: k.streak,
    noter_i_indbakken: k.indbakke,
  };

  return spoerg({
    beskeder: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(data) },
    ],
    temperatur: 0.4,
    maksTokens: 220,
  });
}
