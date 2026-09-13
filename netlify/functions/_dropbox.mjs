/**
 * Delt Dropbox-adgang for funktionerne.
 *
 * Nøglerne bor i Netlifys miljøvariabler. Tokenet caches i funktionens
 * levetid, saa et planlagt tjek der slaar flere filer op kun fornyer
 * adgangen én gang.
 */

let cache = null;

export async function adgangstoken() {
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

/**
 * Henter en fil. `skrevet` er Dropbox' eget stempel; scriptmaskinens ur
 * kan ikke stoles paa, men Dropbox' kan.
 */
export async function hent(sti) {
  const token = await adgangstoken();
  const r = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
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
  const token = await adgangstoken();
  const send = async (mode) =>
    fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Dropbox-API-Arg': JSON.stringify({ path: sti, mode }),
        'Content-Type': 'application/octet-stream',
      },
      body: indhold,
    });

  let r = await send('overwrite');
  if (!r.ok && r.status === 409) r = await send('add');

  return { ok: r.ok, status: r.status, tekst: await r.text() };
}
