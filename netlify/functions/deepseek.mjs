/**
 * DeepSeek-mellemled.
 *
 * Nøglen bliver på serveren. Browseren sender de beskeder der skal
 * behandles, ikke legitimation — så en fundet adresse kan ikke bruges
 * til at tømme kontoen for kredit uden adgangskoden.
 */
import { harAdgang, AFVIST } from './_adgang.mjs';

export default async (request) => {
  if (!harAdgang(request)) return AFVIST.clone();
  if (request.method !== 'POST') return new Response('Metode ikke tilladt.', { status: 405 });

  const noegle = process.env.DEEPSEEK_KEY ?? '';
  if (!noegle) return new Response('DeepSeek er ikke sat op.', { status: 500 });

  let krop;
  try {
    krop = await request.json();
  } catch {
    return new Response('Ugyldig forespørgsel.', { status: 400 });
  }

  // Kun det appen faktisk beder om. Ingen frit valg af model eller længde.
  const svar = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + noegle, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: Array.isArray(krop.messages) ? krop.messages.slice(0, 4) : [],
      temperature: typeof krop.temperature === 'number' ? krop.temperature : 0.3,
      max_tokens: Math.min(typeof krop.max_tokens === 'number' ? krop.max_tokens : 300, 400),
      ...(krop.response_format ? { response_format: krop.response_format } : {}),
    }),
  });

  return new Response(await svar.text(), {
    status: svar.status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/deepseek' };
