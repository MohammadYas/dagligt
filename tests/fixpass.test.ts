import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beregnVagt } from '../app/komponenter/vagtform';
import { bekraeftAbonnement } from '../app/data/varsler';
import { maanedsVarianter } from '../app/komponenter/kalenderdata';
import { DEFAULT_SETTINGS, Shift } from '../src/lon';

const vagt = (p: Partial<Shift>): Shift => ({ id: 'x', employer: 'multicare', date: '2026-10-18', start: '15:00', end: '23:00', unpaidBreakMinutes: 0, createdAt: 0, updatedAt: 0, rateSnapshot: DEFAULT_SETTINGS.rates, ...p });

test('tomt dato- eller tidsfelt i vagtarket giver ugyldig vagt i stedet for at kaste', () => {
  for (const p of [{ date: '' }, { start: '' }, { end: '' }]) {
    const r = beregnVagt(vagt(p), DEFAULT_SETTINGS);
    assert.equal(r.gyldig, false);
    assert.equal(r.beregning.gross, 0);
  }
  assert.equal(beregnVagt(vagt({}), DEFAULT_SETTINGS).gyldig, true);
});

test('eksisterende push-abonnement sendes igen ved app-start', async () => {
  const sendt: unknown[] = [];
  const sub = { toJSON: () => ({ endpoint: 'https://push.example/1' }) };
  assert.equal(await bekraeftAbonnement(async () => sub, async (m, b) => { sendt.push([m, b]); }), true);
  assert.deepEqual(sendt, [['POST', { endpoint: 'https://push.example/1' }]]);
  assert.equal(await bekraeftAbonnement(async () => null, async () => { throw new Error('må ikke kaldes'); }), false);
});

test('måned på vej ud af kalenderen kan ikke trykkes på', () => {
  assert.equal(maanedsVarianter(28).ud(1).pointerEvents, 'none');
  assert.equal(maanedsVarianter(28).mid.pointerEvents, 'auto');
});
