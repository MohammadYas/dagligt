import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus } from '../src/vagter';

const RAA = `CAS VIKARBOOKING – STATUS
Kører: JA (startet kl. 09:51)
Sidste tjek: 2026-11-11 09:55:16
Arbejdspladser (prioriteret): Akut Hjælp
Ledige vagter: 1 (Akut Hjælp: 1) – Matcher: 0
Mode: AKTIV – tager vagter
Dine vagter: 2026-11-12 kl. 07:00 Stillinge (Slots Bjergby Nord)
Interesseret: 2026-11-11
Taget i alt: 0 (max 3 pr. dato)
Fejl i træk: 0
Sidste pushed opdatering: 2026-11-11 09:55:16
`;

test('status parsers interesseret-linjen', () => {
  const status = parseStatus(RAA, new Date('2026-11-11T09:55:16'));
  assert.equal(status.koerer, true);
  assert.equal(status.interesseret, '2026-11-11');
  assert.equal(status.dine, '2026-11-12 kl. 07:00 Stillinge (Slots Bjergby Nord)');
  assert.equal(status.taget, '0');
  assert.equal(status.ledige, 1);
  assert.equal(status.matcher, 0);
});

test('status uden interesseret-linje giver null', () => {
  const status = parseStatus('Kører: JA\nDine vagter: ingen\n');
  assert.equal(status.interesseret, null);
});
