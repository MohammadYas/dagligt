import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Dropbox renews a rejected token once and retries downloads and overwrite uploads', async () => {
  const original = globalThis.fetch;
  let tokens = 0; let downloads = 0; let uploads = 0;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (url.includes('oauth2')) return Response.json({ access_token: `t${++tokens}`, expires_in: 14400 });
    if (url.includes('download')) {
      downloads++;
      return downloads === 1 ? new Response('', { status: 401 }) : new Response('CAS: ON', { headers: { 'dropbox-api-result': JSON.stringify({ server_modified: '2026-09-21T12:00:00Z' }) } });
    }
    uploads++;
    assert.equal(JSON.parse((init.headers as Record<string,string>)['Dropbox-API-Arg']).mode, 'overwrite');
    return new Response('', { status: 401 });
  }) as typeof fetch;
  try {
    const { hent, gem } = await import('../netlify/functions/_dropbox.mjs');
    assert.equal((await hent('/kontrol.txt')).tekst, 'CAS: ON');
    assert.equal(downloads, 2); assert.equal(tokens, 2);
    assert.equal((await gem('/kontrol.txt', 'CAS: OFF')).status, 401);
    assert.equal(uploads, 2); assert.equal(tokens, 3);
  } finally { globalThis.fetch = original; }
});
