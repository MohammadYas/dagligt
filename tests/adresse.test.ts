import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soeg } from '../src/adresse';

type Props = Record<string, string>;
const feature = (p: Props, lon = 11.3667, lat = 55.4061) => ({ type: 'Feature', properties: p, geometry: { type: 'Point', coordinates: [lon, lat] } });
const SMEDEGADE = { street: 'Smedegade', housenumber: '32', postcode: '4200', city: 'Slagelse', locality: 'Kirkegårdshuse', countrycode: 'DK' };

async function withFetch<T>(respond: (url: string) => Response, run: (calls: string[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => { calls.push(String(url)); return respond(String(url)); }) as typeof fetch;
  try { return await run(calls); } finally { globalThis.fetch = original; }
}
const collection = (...features: unknown[]) => () => Response.json({ type: 'FeatureCollection', features });

test('Photon-svar mappes til samme forslagsform som før', async () => {
  await withFetch(collection(feature(SMEDEGADE)), async () => {
    const [f] = await soeg('Smedegade 32');
    assert.equal(f.kort, 'Smedegade 32');
    assert.equal(f.post, '4200 Slagelse');
    assert.equal(f.bynavn, 'Kirkegårdshuse');
    assert.equal(f.detalje, null);
    assert.equal(f.udenbys, false);
    assert.equal(f.lon, 11.3667);
    assert.equal(f.lat, 55.4061);
    assert.equal(f.tekst, 'Smedegade 32, Kirkegårdshuse, 4200 Slagelse');
  });
});

test('søgningen vægtes mod Slagelse og frasorterer udlandet', async () => {
  await withFetch(collection(feature(SMEDEGADE), feature({ ...SMEDEGADE, countrycode: 'SE', postcode: '21120', city: 'Malmö' })), async calls => {
    const result = await soeg('Smedegade 32');
    const url = new URL(calls[0]);
    assert.equal(url.origin + url.pathname, 'https://photon.komoot.io/api/');
    assert.equal(url.searchParams.get('q'), 'Smedegade 32');
    assert.equal(url.searchParams.get('lat'), '55.40');
    assert.equal(url.searchParams.get('lon'), '11.35');
    assert.equal(url.searchParams.get('lang'), 'default');
    assert.equal(url.searchParams.get('limit'), '12');
    assert.equal(result.length, 1);
  });
});

test('adresser uden vej eller husnummer springes over, og dubletter fjernes', async () => {
  const noNumber = { ...SMEDEGADE, housenumber: '' };
  await withFetch(collection(feature(noNumber), feature({ city: 'Slagelse', countrycode: 'DK' }), feature(SMEDEGADE), feature(SMEDEGADE)), async () => {
    assert.equal((await soeg('Smedegade')).length, 1);
  });
});

test('adresser uden for Slagelse Kommune markeres', async () => {
  await withFetch(collection(feature({ street: 'Rådhuspladsen', housenumber: '1', postcode: '1550', city: 'København V', countrycode: 'DK' })), async () => {
    assert.equal((await soeg('Rådhuspladsen 1'))[0].udenbys, true);
  });
});

test('for kort søgning kalder ikke nettet', async () => {
  await withFetch(collection(), async calls => {
    assert.deepEqual(await soeg(' a '), []);
    assert.equal(calls.length, 0);
  });
});

test('fejlsvar giver en læsbar fejl', async () => {
  await withFetch(() => new Response('down', { status: 503 }), async () => {
    await assert.rejects(soeg('Smedegade 32'), { message: 'Adressesøgningen svarer ikke lige nu.' });
  });
});
