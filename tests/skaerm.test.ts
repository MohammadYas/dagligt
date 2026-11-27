import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fraHash } from '../app/rute';

test('nye skærmnavne læses direkte', () => {
  for (const s of ['hjem', 'dage', 'arbejdspladser', 'indstillinger', 'loen', 'rute'] as const) assert.equal(fraHash('#' + s), s);
});

test('gamle adresser fra den forrige app lander rigtigt', () => {
  assert.equal(fraHash('#vagter'), 'hjem');
  assert.equal(fraHash('#oensker'), 'dage');
  assert.equal(fraHash('#bureauer'), 'arbejdspladser');
  assert.equal(fraHash('#lon'), 'loen');
  assert.equal(fraHash('#par'), 'hjem');
});

test('tom, ukendt eller adgangs-hash giver forsiden', () => {
  assert.equal(fraHash(''), 'hjem');
  assert.equal(fraHash('#'), 'hjem');
  assert.equal(fraHash('#n=abc'), 'hjem');
  assert.equal(fraHash('#noget'), 'hjem');
});
