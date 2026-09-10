import { DB, dayKey, longDate, greeting, streak } from './store';
import { hentFil } from './dropbox';
import { FILER, parseOensker, parseStatus, tilstand, Script } from './vagter';

const NOEGLE = process.env.EXPO_PUBLIC_DEEPSEEK_KEY ?? '';

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
      const s = parseStatus(await hentFil(FILER[sc].status));
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
  if (!NOEGLE) throw new Error('Ingen DeepSeek-nøgle i .env.');

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

  const svar = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${NOEGLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.4,
      max_tokens: 220,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify(data) },
      ],
    }),
  });

  if (!svar.ok) {
    if (svar.status === 401) throw new Error('DeepSeek afviste nøglen.');
    if (svar.status === 402) throw new Error('DeepSeek-kontoen har ingen kredit tilbage.');
    throw new Error(`DeepSeek svarede ${svar.status}.`);
  }

  const j = await svar.json();
  const tekst: string = j?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!tekst) throw new Error('DeepSeek returnerede et tomt svar.');
  return tekst;
}
