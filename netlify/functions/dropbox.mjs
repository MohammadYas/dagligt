/**
 * Dropbox-mellemled.
 *
 * Nøglerne bor i Netlifys miljøvariabler og forlader aldrig serveren.
 * Browseren beder om "hent /dage.txt", ikke om et token — så en adresse
 * der falder i de forkerte hænder giver adgang til de fire filer, ikke
 * til hele Dropbox-kontoen.
 */

import { harAdgang, AFVIST } from './_adgang.mjs';
import { hent, gem } from './_dropbox.mjs';

const TILLADTE = new Set([
  '/dage.txt',
  '/torn_dage.txt',
  '/status_cas.txt',
  '/status_torn.txt',
]);

export default async (request) => {
  if (!harAdgang(request)) return AFVIST.clone();

  const url = new URL(request.url);
  const sti = url.searchParams.get('sti') ?? '';

  if (!TILLADTE.has(sti)) {
    return new Response('Ukendt fil.', { status: 400 });
  }

  if (request.method === 'GET') {
    try {
      const r = await hent(sti);
      // Dropbox' eget skrivetidspunkt sendes med: maskinen der koerer
      // scripterne har et ur der gaar forkert, saa filens egen tid lyver.
      return new Response(r.tekst, {
        status: r.status,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Expose-Headers': 'x-skrevet',
          ...(r.skrevet ? { 'x-skrevet': r.skrevet } : {}),
        },
      });
    } catch (e) {
      return new Response(String(e instanceof Error ? e.message : e), { status: 502 });
    }
  }

  if (request.method === 'POST') {
    try {
      const krop = await request.text();
      const r = await gem(sti, krop);
      return new Response(r.ok ? 'ok' : r.tekst, { status: r.status });
    } catch (e) {
      return new Response(String(e instanceof Error ? e.message : e), { status: 502 });
    }
  }

  return new Response('Metode ikke tilladt.', { status: 405 });
};

export const config = { path: '/api/dropbox' };
