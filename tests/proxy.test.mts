import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/dropbox.mjs';

test('proxy rejects unauthorized requests, unknown paths and status uploads before Dropbox', async () => {
  const previous = process.env.APP_ADGANGSKODE;
  const fetch = globalThis.fetch;
  process.env.APP_ADGANGSKODE = 'test-only';
  globalThis.fetch = async () => { throw new Error('Must not contact Dropbox'); };
  try {
    assert.equal((await handler(new Request('https://local/api/dropbox?sti=/dage.txt'))).status, 401);
    const request = (path: string) => new Request('https://local/api/dropbox?sti=' + path, { method: 'POST', headers: { 'x-adgang': 'test-only' }, body: 'test' });
    assert.equal((await handler(request('/status_cas.txt'))).status, 405);
    assert.equal((await handler(request('/status_torn.txt'))).status, 405);
    assert.equal((await handler(request('/private.txt'))).status, 400);
  } finally {
    globalThis.fetch = fetch;
    if (previous === undefined) delete process.env.APP_ADGANGSKODE;
    else process.env.APP_ADGANGSKODE = previous;
  }
});
