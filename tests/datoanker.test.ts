import test from 'node:test';
import assert from 'node:assert/strict';
import { kalenderAnker } from '../src/datoanker';

const IDAG = '2026-11-11';

test('kalenderen åbner på den første kommende valgte dato', () => {
  assert.equal(
    kalenderAnker('', ['2026-09-09', '2026-11-11', '2026-12-24'], IDAG),
    '2026-11-11',
  );
});

test('gamle valgte datoer springes over', () => {
  assert.equal(
    kalenderAnker('', ['2026-09-09', '2026-10-01', '2026-12-24'], IDAG),
    '2026-12-24',
  );
});

test('falder tilbage til i dag når alle valgte datoer er gamle', () => {
  assert.equal(kalenderAnker('', ['2026-09-09'], IDAG), IDAG);
});

test('en gyldig value har forrang', () => {
  assert.equal(kalenderAnker('2026-10-01', ['2026-12-24'], IDAG), '2026-10-01');
});

test('ugyldige datoer ignoreres', () => {
  assert.equal(
    kalenderAnker('', ['', '2026-13-99', '2026-02-30', '2026-11-12'], IDAG),
    '2026-11-12',
  );
});

test('tom liste giver i dag', () => {
  assert.equal(kalenderAnker('', [], IDAG), IDAG);
});
