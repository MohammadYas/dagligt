/**
 * Dropbox-mellemled.
 *
 * Nøglerne bor i Netlifys miljøvariabler og forlader aldrig serveren.
 * Browseren beder om "hent /dage.txt", ikke om et token — så en adresse
 * der falder i de forkerte hænder giver adgang til de fire filer, ikke
 * til hele Dropbox-kontoen.
 */

import { harAdgang, AFVIST } from './_adgang.mjs';

const TILLADTE = new Set([
  '/dage.txt',
  '/torn_dage.txt',
  '/status_cas.txt',
  '/status_torn.txt',
]);

let cache = null;

async function adgangstoken() {
  if (cache && Date.now() < cache.udloeber) return cache.vaerdi;

  const svar = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=refresh_token' +
      '&refresh_token=' + encodeURIComponent(process.env.DROPBOX_REFRESH_TOKEN ?? '') +
      '&client_id=' + encodeURIComponent(process.env.DROPBOX_APP_KEY ?? '') +
      '&client_secret=' + encodeURIComponent(process.env.DROPBOX_APP_SECRET ?? ''),
  });

  if (!svar.ok) throw new Error('Kunne ikke forny adgangen til Dropbox (' + svar.status + ').');

  const data = await svar.json();
  cache = {
    vaerdi: data.access_token,
    udloeber: Date.now() + (data.expires_in ?? 14400) * 1000 - 60000,
  };
  return cache.vaerdi;
}

export default async (request) => {
  if (!harAdgang(request)) return AFVIST.clone();

  const url = new URL(request.url);
  const sti = url.searchParams.get('sti') ?? '';

  if (!TILLADTE.has(sti)) {
    return new Response('Ukendt fil.', { status: 400 });
  }

  let token;
  try {
    token = await adgangstoken();
  } catch (e) {
    return new Response(String(e instanceof Error ? e.message : e), { status: 502 });
  }

  if (request.method === 'GET') {
    const r = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': JSON.stringify({ path: sti }),
      },
    });
    const tekst = await r.text();
    return new Response(tekst, {
      status: r.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (request.method === 'POST') {
    const krop = await request.text();
    const r = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': JSON.stringify({ path: sti, mode: 'overwrite' }),
        'Content-Type': 'application/octet-stream',
      },
      body: krop,
    });
    return new Response(r.ok ? 'ok' : await r.text(), { status: r.status });
  }

  return new Response('Metode ikke tilladt.', { status: 405 });
};

export const config = { path: '/api/dropbox' };
