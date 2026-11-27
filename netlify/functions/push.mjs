/**
 * Gemmer og fjerner telefonens push-abonnement.
 *
 * Abonnementet ligger i Dropbox, saa den planlagte funktion tjek_torn kan
 * sende varsler naar CAS-scriptet tier. Browseren sender kun sit
 * abonnement hertil; noeglerne til at sende med bor i miljoevariablerne.
 */
import { harAdgang, AFVIST } from './_adgang.mjs';
import { gem } from './_dropbox.mjs';

const STI = '/push_abonnement.txt';

export default async (request) => {
  if (!harAdgang(request)) return AFVIST.clone();

  try {
    if (request.method === 'POST') {
      let abonnement;
      try {
        abonnement = JSON.parse(await request.text());
      } catch {
        return new Response('Ugyldigt abonnement.', { status: 400 });
      }
      if (!abonnement || !abonnement.endpoint) {
        return new Response('Abonnementet mangler endpoint.', { status: 400 });
      }
      const r = await gem(STI, JSON.stringify({ abonnement, sidstVarslet: null }));
      return new Response(r.ok ? 'ok' : r.tekst, { status: r.status });
    }

    if (request.method === 'DELETE') {
      const r = await gem(STI, JSON.stringify({ abonnement: null, sidstVarslet: null }));
      return new Response(r.ok ? 'ok' : r.tekst, { status: r.status });
    }
  } catch (e) {
    return new Response(String(e instanceof Error ? e.message : e), { status: 502 });
  }

  return new Response('Metode ikke tilladt.', { status: 405 });
};

export const config = { path: '/api/push' };
