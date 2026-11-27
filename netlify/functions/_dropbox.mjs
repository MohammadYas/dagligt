/**
 * Delt Dropbox-adgang for funktionerne.
 *
 * Nøglerne bor i Netlifys miljøvariabler. Tokenet caches i funktionens
 * levetid, saa et planlagt tjek der slaar flere filer op kun fornyer
 * adgangen én gang.
 */

let cache = null;
let renewing = null;

export async function adgangstoken() {
  if (cache && Date.now() < cache.udloeber) return cache.vaerdi;
  if (renewing) return renewing;
  renewing = forny();
  try { return await renewing; } finally { renewing = null; }
}

async function forny() {

  const svar = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
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

async function request(path, init) {
  const send = async () => fetch('https://content.dropboxapi.com/2/files/' + path, {
    ...init, signal: AbortSignal.timeout(20000),
    headers: { ...init.headers, Authorization: 'Bearer ' + await adgangstoken() },
  });
  let r = await send();
  if (r.status === 401) { cache = null; await r.text(); r = await send(); }
  return r;
}

/**
 * Henter en fil. `skrevet` er Dropbox' eget stempel; scriptmaskinens ur
 * kan ikke stoles paa, men Dropbox' kan.
 */
export async function hent(sti) {
  const r = await request('download', {
    method: 'POST',
    headers: {
      'Dropbox-API-Arg': JSON.stringify({ path: sti }),
    },
  });

  const tekst = await r.text();
  let skrevet = null;
  if (r.ok) {
    try {
      skrevet = JSON.parse(r.headers.get('dropbox-api-result') ?? '{}').server_modified ?? null;
    } catch {}
  }

  return { ok: r.ok, status: r.status, tekst, skrevet };
}

/** Skriver en fil. Opretter den hvis den ikke findes endnu. */
export async function gem(sti, indhold) {
  const r = await request('upload', {
      method: 'POST',
      headers: {
        'Dropbox-API-Arg': JSON.stringify({ path: sti, mode: 'overwrite' }),
        'Content-Type': 'application/octet-stream',
      },
      body: indhold,
    });

  return { ok: r.ok, status: r.status, tekst: await r.text() };
}
