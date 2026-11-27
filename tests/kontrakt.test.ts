// Golden tests: the exact bytes the CAS/TØRN scripts read from Dropbox.
// Captured from the deployed code on 2026-11-27. Never edit these strings
// to make a change pass — a difference means the file language changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { laes, skriv, skrivKontrol, Bureau } from '../src/vagtdata';
import { bureauer, kontrol } from './fixtures/dropbox.mjs';

const VEJLEDNING = '# ARBEJDSPLADSER – i prioriteret rækkefølge (1. linje = højeste prioritet).\n# Sæt # foran en arbejdsplads for at SLÅ DEN FRA.\n';
const MULTICARE = 'MultiCare- pædagogisk og sundhedsfagligt vikarbureau';

test('kontrol skrives præcist', () => {
  assert.equal(skrivKontrol({ cas: true, torn: false }), 'CAS: ON\nTØRN: OFF\n');
});

test('kontrol-fil rundtur', () => {
  assert.equal(skriv('kontrol', laes('kontrol', kontrol)), 'CAS: ON\nTØRN: ON\n');
});

test('dage sorteres og dubletter fjernes', () => {
  assert.equal(
    skriv('cas', { datoer: ['2026-12-03', '2026-12-01', '2026-12-01'], steder: ['Team Forlev', 'Team Sørby'] }),
    '2026-12-01\n2026-12-03\nTeam Forlev\nTeam Sørby\n',
  );
});

test('ingen dage = tom fil', () => {
  assert.equal(skriv('cas', { datoer: [], steder: [] }), '');
});

test('gammel ønskefil rundtur', () => {
  const gammel = '# ---- DAGE ----\n2026-09-25\n# 2026-09-20\n# ---- STEDER ----\nTeam Forlev\n# Team Nygade\n';
  assert.equal(skriv('cas', laes('cas', gammel)), '2026-09-25\nTeam Forlev\n');
});

test('torn skrives som cas', () => {
  const dage = { datoer: ['2026-12-01'], steder: ['Team Forlev'] };
  assert.equal(skriv('torn', dage), '2026-12-01\nTeam Forlev\n');
  assert.equal(skriv('torn', dage), skriv('cas', dage));
});

test('bureauer rundtur', () => {
  assert.equal(skriv('bureauer', laes('bureauer', bureauer), bureauer), bureauer);
});

test('slukket MultiCare', () => {
  const b: Bureau[] = laes('bureauer', bureauer).map((r, i) => (i === 1 ? { ...r, aktiv: false } : r));
  assert.equal(skriv('bureauer', b, bureauer), VEJLEDNING + 'Akut Hjælp\n# ' + MULTICARE + '\n');
});

test('prioritet byttet', () => {
  const b = laes('bureauer', bureauer);
  assert.equal(skriv('bureauer', [b[1], b[0]], bureauer), VEJLEDNING + MULTICARE + '\nAkut Hjælp\n');
});

test('par', () => {
  assert.equal(skriv('par', [{ a: 'Teststed CAS', b: 'Teststed TØRN' }]), 'Teststed CAS = Teststed TØRN\n');
});
