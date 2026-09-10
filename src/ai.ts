import { erWeb, harAdgang, adgangsHeader } from './adgang';
import { hentKonfig } from './konfig';

type Besked = { role: 'system' | 'user'; content: string };

/**
 * Kalder DeepSeek. Paa web gaar det gennem Netlify-funktionen, saa noeglen
 * bliver paa serveren; paa telefonen ligger noeglen i bundtet og bruges
 * direkte, saa appen virker uden net til mellemleddet.
 */
export async function spoerg(opts: {
  beskeder: Besked[];
  temperatur?: number;
  maksTokens?: number;
  somJson?: boolean;
}): Promise<string> {
  const krop = {
    messages: opts.beskeder,
    temperature: opts.temperatur ?? 0.3,
    max_tokens: opts.maksTokens ?? 300,
    ...(opts.somJson ? { response_format: { type: 'json_object' } } : {}),
  };

  let svar: Response;

  if (erWeb) {
    if (!harAdgang()) throw new Error('Appen er ikke låst op.');
    svar = await fetch('/api/deepseek', {
      method: 'POST',
      headers: { ...adgangsHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(krop),
    });
  } else {
    const noegle = (await hentKonfig()).deepseek;
    if (!noegle) throw new Error('DeepSeek er ikke sat op. Indtast nøglen under Projekter.');
    svar = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + noegle, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', ...krop }),
    });
  }

  if (!svar.ok) {
    if (svar.status === 401) throw new Error('DeepSeek afviste nøglen.');
    if (svar.status === 402) throw new Error('DeepSeek-kontoen har ingen kredit tilbage.');
    if (svar.status === 429) throw new Error('For mange kald til DeepSeek lige nu.');
    throw new Error('DeepSeek svarede ' + svar.status + '.');
  }

  const j = await svar.json();
  const tekst: string = j?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!tekst) throw new Error('DeepSeek returnerede et tomt svar.');
  return tekst;
}

export async function kanRense(): Promise<boolean> {
  if (erWeb) return harAdgang();
  return (await hentKonfig()).deepseek.length > 0;
}
