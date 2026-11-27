import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maanedsCeller } from '../app/komponenter/kalenderdata';

test('februar 2026 starter søndag: 6 tomme celler og 28 datoer', () => {
  const c = maanedsCeller(2026, 1);
  assert.deepEqual(c.slice(0, 6), [null, null, null, null, null, null]);
  assert.equal(c[6], '2026-02-01');
  assert.equal(c.filter(Boolean).length, 28);
  assert.equal(c[c.length - 1], '2026-02-28');
});

test('november 2026: 6 tomme celler og 30 datoer', () => {
  const c = maanedsCeller(2026, 10);
  assert.equal(c.indexOf('2026-11-01'), 6);
  assert.equal(c.filter(Boolean).length, 30);
});

test('en måned der starter mandag har ingen tomme celler', () => {
  assert.equal(maanedsCeller(2026, 5)[0], '2026-06-01');
});
