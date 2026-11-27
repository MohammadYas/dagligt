import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKontrol, skrivKontrol, parseDage, skrivDage, parseBureauer, skrivBureauer, parsePar, skrivPar, navn, dato } from '../src/vagtdata';
import { bureauer as liveBureauer, kontrol as liveKontrol } from './fixtures/dropbox.mjs';

test('Dropbox-bureaufilens vejledning bliver ikke til kontakter', () => {
  assert.deepEqual(parseBureauer(liveBureauer), [
    { navn: 'Akut Hjælp', aktiv: true },
    { navn: 'MultiCare- pædagogisk og sundhedsfagligt vikarbureau', aktiv: true },
  ]);
  assert.deepEqual(parseKontrol(liveKontrol), { cas: true, torn: true });
});
test('slukket MultiCare bevarer hele navnet, prioriteten og vejledningen', () => {
  const rows = [
    { navn: 'Akut Hjælp', aktiv: true },
    { navn: 'MultiCare- pædagogisk og sundhedsfagligt vikarbureau', aktiv: false },
  ];
  const text = skrivBureauer(rows, liveBureauer);
  assert.equal(text, liveBureauer.replace('\nMultiCare-', '\n# MultiCare-'));
  assert.deepEqual(parseBureauer(text), rows);
  assert.deepEqual(parseBureauer(text.replace('\nAkut Hjælp', '\n# Akut Hjælp')), rows.map(r => ({ ...r, aktiv: false })));
});

test('kontakter er uafhængige og bruger præcis TØRN', () => {
  assert.deepEqual(parseKontrol('CAS: ON\nTØRN: OFF\n'), { cas: true, torn: false });
  assert.equal(skrivKontrol({ cas: false, torn: true }), 'CAS: OFF\nTØRN: ON\n');
  assert.throws(() => parseKontrol('CAS: ON'), /kontakt/);
});
test('rene og gamle ønskefiler læses uden at gøre kommentarer til steder', () => {
  assert.deepEqual(parseDage('2026-09-22\nTeam Sørby\nEt helt nyt sted\n'), { datoer: ['2026-09-22'], steder: ['Team Sørby', 'Et helt nyt sted'] });
  assert.deepEqual(parseDage('# STEDER\n# Team Forlev\nTeam Sørby\n# 2026-09-21\n'), { datoer: [], steder: ['Team Sørby'] });
  assert.equal(skrivDage({ datoer: ['2026-09-23', '2026-09-21', '2026-09-21'], steder: ['Team Sørby'] }), '2026-09-21\n2026-09-23\nTeam Sørby\n');
});
test('bureauer bevarer rækkefølge og slukkede rækker', () => {
  const rows = parseBureauer('MultiCare\n# Akut Hjælp\n');
  assert.deepEqual(rows, [{ navn: 'MultiCare', aktiv: true }, { navn: 'Akut Hjælp', aktiv: false }]);
  assert.equal(skrivBureauer(rows.reverse()), '# Akut Hjælp\nMultiCare\n');
});
test('par er strukturerede og ufærdige par afvises', () => {
  assert.deepEqual(parsePar('# Forklaring\nTeam A = Hjemmepleje B\n'), [{ a: 'Team A', b: 'Hjemmepleje B' }]);
  assert.equal(skrivPar([{ a: 'A', b: 'B' }]), 'A = B\n');
  assert.throws(() => skrivPar([{ a: 'A', b: '' }]), /navn/i);
  assert.throws(() => parsePar('A B'), /par/i);
});
test('navne kan ikke injicere nye fil-linjer eller specialsyntaks', () => {
  for (const bad of ['A\nB', '# A', 'A = B', '', '2026-09-22']) assert.throws(() => navn(bad));
  assert.equal(navn('  Team Sønderås  '), 'Team Sønderås');
  assert.throws(() => skrivBureauer([{ navn: 'CAS', aktiv: true }, { navn: 'cas', aktiv: false }]), /flere/i);
});
test('rigtige kalenderdatoer og dubletter valideres', () => {
  assert.equal(dato('2028-02-29'), '2028-02-29');
  assert.throws(() => dato('2026-02-29'));
  assert.throws(() => dato('2026-13-01'));
});
