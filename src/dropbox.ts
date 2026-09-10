// Raa HTTP mod Dropbox. Ingen SDK.

const TOKEN = process.env.EXPO_PUBLIC_DROPBOX_TOKEN ?? '';
const APP_KEY = process.env.EXPO_PUBLIC_DROPBOX_APP_KEY ?? '';
const APP_SECRET = process.env.EXPO_PUBLIC_DROPBOX_APP_SECRET ?? '';
const REFRESH = process.env.EXPO_PUBLIC_DROPBOX_REFRESH_TOKEN ?? '';

export class DropboxFejl extends Error {
  constructor(public besked: string, public status: number) {
    super(besked);
  }
}

// Adgangstokens fra refresh-flowet holder 4 timer. Vi genbruger indtil kort foer udloeb.
let cache: { vaerdi: string; udloeber: number } | null = null;

async function adgangstoken(): Promise<string> {
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
    throw new DropboxFejl('Ingen Dropbox-token opsat. Udfyld .env i projektet.', 0);
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

export async function hentFil(sti: string): Promise<string> {
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

export const harOpsaetning = Boolean(TOKEN || (REFRESH && APP_KEY && APP_SECRET));
