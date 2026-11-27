import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vurder, vapidSubjekt } from '../netlify/functions/_varsel.mjs';

const NU = Date.parse('2026-11-27T12:00:00Z');
const minSiden = (m: number) => new Date(NU - m * 60_000).toISOString();
const abonnement = { endpoint: 'https://example.invalid/push' };
const status = (taget = '0', dine = 'ingen') => `Kører: JA\nTaget i alt: ${taget} (max 3 pr. dato)\nDine vagter: ${dine}\n`;

test('CAS melder sig: gammelt varsel ryddes, ingen besked', () => {
  const r = vurder({ gemt: { abonnement, sidstVarslet: minSiden(20), sidstTaget: 0 }, statusTekst: status(), skrevet: minSiden(2), nu: NU });
  assert.deepEqual(r.beskeder, []);
  assert.equal(r.nyGemt.sidstVarslet, null);
});

test('CAS tavs i over tre minutter giver varsel', () => {
  const r = vurder({ gemt: { abonnement, sidstVarslet: null, sidstTaget: 0 }, statusTekst: status(), skrevet: minSiden(4), nu: NU });
  assert.deepEqual(r.beskeder, [{ titel: 'CAS melder sig ikke', tekst: 'Status er mere end tre minutter gammel.' }]);
  assert.equal(r.nyGemt.sidstVarslet, new Date(NU).toISOString());
});

test('højst ét tavsheds-varsel hvert tiende minut', () => {
  const r = vurder({ gemt: { abonnement, sidstVarslet: minSiden(5), sidstTaget: 0 }, statusTekst: status(), skrevet: minSiden(8), nu: NU });
  assert.deepEqual(r.beskeder, []);
});

test('første gang et tal ses, er det kun udgangspunkt (gammel fil uden sidstTaget)', () => {
  const r = vurder({ gemt: { abonnement, sidstVarslet: null }, statusTekst: status('2'), skrevet: minSiden(1), nu: NU });
  assert.deepEqual(r.beskeder, []);
  assert.equal(r.nyGemt.sidstTaget, 2);
});

test('stigende "Taget i alt" giver besked med den nye vagt', () => {
  const r = vurder({ gemt: { abonnement, sidstVarslet: null, sidstTaget: 2 }, statusTekst: status('3', '2026-11-12 kl. 07:00 Stillinge'), skrevet: minSiden(1), nu: NU });
  assert.deepEqual(r.beskeder, [{ titel: 'Ny vagt taget', tekst: '2026-11-12 kl. 07:00 Stillinge' }]);
  assert.equal(r.nyGemt.sidstTaget, 3);
});

test('"1/3" læses som 1, og et faldende tal giver ingen besked', () => {
  const r = vurder({ gemt: { abonnement, sidstVarslet: null, sidstTaget: 2 }, statusTekst: 'Kører: JA\nTaget i dag: 1/3\n', skrevet: minSiden(1), nu: NU });
  assert.deepEqual(r.beskeder, []);
  assert.equal(r.nyGemt.sidstTaget, 1);
});

test('VAPID-afsender uden mailto: rettes, så web-push accepterer den', () => {
  assert.equal(vapidSubjekt('navn@example.com'), 'mailto:navn@example.com');
  assert.equal(vapidSubjekt('mailto:navn@example.com'), 'mailto:navn@example.com');
  assert.equal(vapidSubjekt('https://example.com'), 'https://example.com');
  assert.equal(vapidSubjekt(undefined), 'mailto:varsel@localhost');
});

test('push-abonnement ved app-åbning beholder sidstVarslet og sidstTaget', async () => {
  const previous = process.env.APP_ADGANGSKODE;
  const original = globalThis.fetch;
  process.env.APP_ADGANGSKODE = 'test-only';
  let uploaded = '';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    if (String(url).includes('oauth2')) return Response.json({ access_token: 't', expires_in: 14400 });
    if (String(url).includes('download')) return new Response(JSON.stringify({ abonnement: { endpoint: 'old' }, sidstVarslet: '2026-11-27T11:00:00.000Z', sidstTaget: 3 }));
    uploaded = String(init.body); return new Response('{}');
  }) as typeof fetch;
  try {
    const { default: handler } = await import('../netlify/functions/push.mjs');
    const r = await handler(new Request('https://local/api/push', { method: 'POST', headers: { 'x-adgang': 'test-only' }, body: JSON.stringify({ endpoint: 'new' }) }));
    assert.equal(r.status, 200);
    assert.deepEqual(JSON.parse(uploaded), { sidstVarslet: '2026-11-27T11:00:00.000Z', sidstTaget: 3, abonnement: { endpoint: 'new' } });
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.APP_ADGANGSKODE; else process.env.APP_ADGANGSKODE = previous;
  }
});
