// Raa HTTP mod Dropbox. Ingen SDK.

import { hentKonfig, harDropbox } from './konfig';
import { erWeb, harAdgang, adgangsHeader } from './adgang';

export class DropboxFejl extends Error {
  constructor(public besked: string, public status: number) {
    super(besked);
  }
}

// Adgangstokens fra refresh-flowet holder 4 timer. Vi genbruger indtil kort foer udloeb.
let cache: { vaerdi: string; udloeber: number } | null = null;

async function adgangstoken(): Promise<string> {
  const k = await hentKonfig();
  const TOKEN = k.dropboxToken;
  const APP_KEY = k.dropboxAppKey;
  const APP_SECRET = k.dropboxAppSecret;
  const REFRESH = k.dropboxRefresh;

  if (REFRESH && APP_KEY && APP_SECRET) {
    if (cache && Date.now() < cache.udloeber) return cache.vaerdi;

    const svar = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        'grant_type=refresh_token' +
        '&refresh_token=' + encodeURIComponent(REFRESH) +
        '&client_id=' + encodeURIComponent(APP_KEY) +
        '&client_secret=' + encodeURIComponent(APP_SECRET),
    });

    if (!svar.ok) {
      throw new DropboxFejl(
        'Kunne ikke forny adgangen til Dropbox. Tjek app-nøgle, hemmelighed og refresh-token.',
        svar.status,
      );
    }

    const data = (await svar.json()) as { access_token: string; expires_in?: number };
    const levetid = (data.expires_in ?? 14400) * 1000;
    cache = { vaerdi: data.access_token, udloeber: Date.now() + levetid - 60_000 };
    return cache.vaerdi;
  }

  if (!TOKEN) {
    throw new DropboxFejl('Dropbox er ikke sat op. Indtast nøglerne under Projekter.', 0);
  }
  return TOKEN;
}

function oversaetFejl(status: number, krop: string): DropboxFejl {
  if (status === 401) {
    return new DropboxFejl(
      'Dropbox afviste tokenet (401). Den kortlivede token er udløbet — skift til refresh-token, eller indsæt en ny.',
      401,
    );
  }
  if (status === 400) {
    return new DropboxFejl(
      'Dropbox afviste kaldet (400). Appen mangler sandsynligvis rettigheden files.content.read / files.content.write.',
      400,
    );
  }
  if (status === 409) {
    return new DropboxFejl('Filen findes ikke i Dropbox (409).', 409);
  }
  const kort = krop.slice(0, 140).replace(/\s+/g, ' ').trim();
  return new DropboxFejl(`Dropbox svarede ${status}. ${kort}`, status);
}

export type Fil = { tekst: string; skrevet: Date | null };

/** Tidspunktet Dropbox selv noterede. Foelger med i svaret, gratis. */
function skrevetFra(h: Headers): Date | null {
  const raa = h.get('dropbox-api-result') ?? h.get('x-skrevet');
  if (!raa) return null;
  try {
    const naar = raa.startsWith('{') ? JSON.parse(raa).server_modified : raa;
    const d = new Date(naar);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Som hentFil, men med det tidspunkt Dropbox skrev filen.
 *
 * Maskinen der koerer scripterne har et ur der gaar ni timer forkert, saa
 * "Sidste tjek" i filen kan ikke bruges til at maale alder. Dropbox'
 * eget stempel er uafhaengigt af den maskines ur.
 */
export async function hentStatus(sti: string): Promise<Fil> {
  if (erWeb) {
    if (!harAdgang()) throw new DropboxFejl('Appen er ikke låst op.', 401);
    const r = await fetch('/api/dropbox?sti=' + encodeURIComponent(sti), {
      headers: adgangsHeader(),
    });
    if (!r.ok) throw oversaetFejl(r.status, await r.text());
    return { tekst: await r.text(), skrevet: skrevetFra(r.headers) };
  }

  const t = await adgangstoken();
  const svar = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t}`,
      'Dropbox-API-Arg': JSON.stringify({ path: sti }),
    },
  });
  if (!svar.ok) throw oversaetFejl(svar.status, await svar.text());
  return { tekst: await svar.text(), skrevet: skrevetFra(svar.headers) };
}

export async function hentFil(sti: string): Promise<string> {
  if (erWeb) {
    if (!harAdgang()) throw new DropboxFejl('Appen er ikke låst op.', 401);
    const r = await fetch('/api/dropbox?sti=' + encodeURIComponent(sti), {
      headers: adgangsHeader(),
    });
    if (!r.ok) throw oversaetFejl(r.status, await r.text());
    return await r.text();
  }

  const t = await adgangstoken();
  const svar = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t}`,
      'Dropbox-API-Arg': JSON.stringify({ path: sti }),
    },
  });
  if (!svar.ok) throw oversaetFejl(svar.status, await svar.text());
  return await svar.text();
}

export async function gemFil(sti: string, indhold: string): Promise<void> {
  if (erWeb) {
    if (!harAdgang()) throw new DropboxFejl('Appen er ikke låst op.', 401);
    const r = await fetch('/api/dropbox?sti=' + encodeURIComponent(sti), {
      method: 'POST',
      headers: { ...adgangsHeader(), 'Content-Type': 'text/plain;charset=UTF-8' },
      body: indhold,
    });
    if (!r.ok) throw oversaetFejl(r.status, await r.text());
    return;
  }

  const t = await adgangstoken();
  const svar = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${t}`,
      'Dropbox-API-Arg': JSON.stringify({ path: sti, mode: 'overwrite' }),
      'Content-Type': 'application/octet-stream',
    },
    body: indhold,
  });
  if (!svar.ok) throw oversaetFejl(svar.status, await svar.text());
}

export async function erOpsat(): Promise<boolean> {
  if (erWeb) return harAdgang();
  return harDropbox(await hentKonfig());
}
