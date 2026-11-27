import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planlaeg, kortLinks, afstand, Stop } from '../src/rute';

const stops: Stop[] = Array.from({ length: 15 }, (_, i) => ({ id: String(i), tekst: `Teststop ${i}`, lat: 55.3 + i / 100, lon: 11.2 + i / 100 }));
test('offline route retains all stops and fixed endpoints without changing the input', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const input = stops.slice(0, 5), before = JSON.stringify(input);
    const route = await planlaeg(input);
    assert.equal(route.rigtigeTider, false);
    assert.equal(route.orden[0].id, input[0].id);
    assert.equal(route.orden.at(-1)!.id, input.at(-1)!.id);
    assert.equal(new Set(route.orden.map(s => s.id)).size, input.length);
    assert.equal(JSON.stringify(input), before);
    assert.ok(route.meter > 0 && route.sekunder > 0);
  } finally { globalThis.fetch = original; }
});
test('routes over eleven coordinates produce connected Maps legs', () => {
  const links = kortLinks(stops);
  assert.equal(links.length, 2);
  assert.equal(new URL(links[0]).searchParams.get('destination'), `${stops[10].lat},${stops[10].lon}`);
  assert.equal(new URL(links[0]).searchParams.get('destination'), new URL(links[1]).searchParams.get('origin'));
});
test('distances use Danish decimal formatting', () => {
  assert.equal(afstand(1100), '1,1 km');
});
