import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePeriodGross, calculateShiftGross, calculateTaxEstimate, DEFAULT_SETTINGS, getISOWeek, getNextPayday, getPayPeriodForDate, loadPayData, naesteLoen, normalisePayData, savePayData, Shift, splitShiftIntoPaySegments, tidligereLoen } from '../src/lon';

const shift = (patch: Partial<Shift>): Shift => ({ id: 's1', employer: 'multicare', date: '2026-09-21', start: '07:00', end: '15:00', unpaidBreakMinutes: 0, createdAt: 1, updatedAt: 1, ...patch });

test('lønperioder følger 14-dages cyklussen og onsdags-udbetaling', () => {
  assert.equal(getISOWeek('2026-09-21'), 39);
  assert.deepEqual(getPayPeriodForDate('2026-09-21'), { start: '2026-09-21', end: '2026-10-04', payday: '2026-10-07' });
  assert.deepEqual(getPayPeriodForDate('2026-10-04'), { start: '2026-09-21', end: '2026-10-04', payday: '2026-10-07' });
  assert.deepEqual(getPayPeriodForDate('2026-10-05'), { start: '2026-10-05', end: '2026-10-18', payday: '2026-10-21' });
  assert.equal(getNextPayday('2026-10-12'), '2026-10-21');
});

test('lønperioden forbliver 14 dage gennem ISO-årsskiftet', () => {
  const late = getPayPeriodForDate('2026-12-31');
  const early = getPayPeriodForDate('2027-01-05');
  assert.equal(getISOWeek('2026-12-31'), 53);
  assert.deepEqual(late, { start: '2026-12-28', end: '2027-01-10', payday: '2027-01-13' });
  assert.deepEqual(early, late);
});

test('standardsatser rammer hverdag, weekend og standardvagter', () => {
  assert.equal(calculateShiftGross(shift({}), DEFAULT_SETTINGS).gross, 1640);
  assert.equal(calculateShiftGross(shift({ employer: 'akut', date: '2026-09-26', start: '15:00', end: '23:00' }), DEFAULT_SETTINGS).gross, 3156);
  assert.equal(calculateShiftGross(shift({ start: '15:00', end: '23:00' }), DEFAULT_SETTINGS).gross, 2000);
  assert.equal(calculateShiftGross(shift({ start: '23:00', end: '07:00' }), DEFAULT_SETTINGS).gross, 2000);
});

test('motoren opdeler vagter ved sats- og weekendgrænser', () => {
  const cross = calculateShiftGross(shift({ start: '14:00', end: '17:00' }), DEFAULT_SETTINGS);
  assert.deepEqual(cross.segments.map(s => [s.start, s.end, s.rate]), [['14:00', '15:00', 205], ['15:00', '17:00', 250]]);
  assert.equal(cross.gross, 705);
  const overnight = calculateShiftGross(shift({ date: '2026-09-25', start: '23:00', end: '07:00' }), DEFAULT_SETTINGS);
  assert.deepEqual(overnight.segments.map(s => [s.date, s.start, s.end, s.rate]), [['2026-09-25', '23:00', '00:00', 250], ['2026-09-26', '00:00', '07:00', 352.5]]);
  assert.equal(overnight.gross, 2717.5);
  assert.equal(splitShiftIntoPaySegments(shift({ start: '23:00', end: '07:00' })).reduce((sum, item) => sum + item.minutes, 0), 480);
});

test('ubetalt pause fratrækkes i den segmentbaserede beregning', () => {
  const calculated = calculateShiftGross(shift({ unpaidBreakMinutes: 30 }), DEFAULT_SETTINGS);
  assert.equal(calculated.paidMinutes, 450);
  assert.equal(calculated.gross, 1537.5);
});

test('periode- og skatteestimat bruger hovedkortet én gang', () => {
  const settings = { ...DEFAULT_SETTINGS, taxRate: 37 };
  const period = getPayPeriodForDate('2026-09-21');
  const gross = calculatePeriodGross([
    shift({ id: 'm', employer: 'multicare' }),
    shift({ id: 'a', employer: 'akut', date: '2026-09-26', start: '15:00', end: '23:00' }),
  ], period, settings, new Date('2026-10-01T12:00:00'));
  assert.deepEqual(gross.byEmployer, { multicare: 1640, akut: 3156 });
  const tax = calculateTaxEstimate({ multicare: 5000, akut: 2000 }, settings);
  assert.equal(tax.complete, true);
  assert.equal(tax.am, 560);
  assert.equal(tax.aTax, 1115.55);
  assert.equal(tax.net, 5324.45);
  const withAkutPrimary = calculateTaxEstimate({ multicare: 5000, akut: 2000 }, { ...settings, primaryTaxCardEmployer: 'akut', deductionPerPayPeriod: 1000 });
  assert.equal(withAkutPrimary.deductionUsed, 1000);
});

test('standarden bruger 39 procent træk for både Multicare og Akut Hjælp', () => {
  const tax = calculateTaxEstimate({ multicare: 5000, akut: 2000 }, DEFAULT_SETTINGS);
  assert.equal(DEFAULT_SETTINGS.taxRate, 39);
  assert.equal(tax.complete, true);
  assert.equal(tax.byEmployer.multicare.aTax, 458.25);
  assert.equal(tax.byEmployer.akut.aTax, 717.6);
});

test('eksisterende løndata med tom trækprocent opgraderes til 39 procent', () => {
  const migrated = normalisePayData({ version: 1, settings: { taxRate: null }, shifts: [] });
  assert.equal(migrated.version, 2);
  assert.equal(migrated.settings.taxRate, 39);
});

test('nettoløn markeres ufuldstændig uden brugerens trækprocent', () => {
  const tax = calculateTaxEstimate({ multicare: 1000, akut: 0 }, { ...DEFAULT_SETTINGS, taxRate: null });
  assert.equal(tax.complete, false);
  assert.equal(tax.net, null);
  assert.equal(tax.aTax, null);
});

test('søndagsvagt forbliver i næste løn indtil lønningsdagen', () => {
  for (const d of ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']) {
    assert.equal(naesteLoen(d).payday, '2026-10-21', d);
  }
  assert.equal(naesteLoen('2026-10-22').payday, '2026-11-04');
});

test('tidligere udbetalinger starter dagen efter lønningsdag', () => {
  const s = [shift({ date: '2026-10-18', start: '15:00', end: '23:00' })];
  assert.deepEqual(tidligereLoen(s, '2026-10-21'), []);
  assert.deepEqual(tidligereLoen(s, '2026-10-22').map(p => p.payday), ['2026-10-21']);
});

test('tidligere udbetalinger er unikke og nyeste først', () => {
  const s = [shift({ id: 'a', date: '2026-09-21' }), shift({ id: 'b', date: '2026-09-22' }), shift({ id: 'c', date: '2026-10-06' })];
  assert.deepEqual(tidligereLoen(s, '2026-11-01').map(p => p.payday), ['2026-10-21', '2026-10-07']);
});

test('vagter gemt af den gamle app læses uændret', async () => {
  const raa = '{"version":2,"shifts":[{"id":"a1","employer":"akut","date":"2026-10-18","start":"15:00","end":"23:00","unpaidBreakMinutes":30,"createdAt":1,"updatedAt":2}],"settings":' + JSON.stringify(DEFAULT_SETTINGS) + '}';
  const g = globalThis as any;
  const before = g.localStorage;
  g.localStorage = { getItem: (k: string) => (k === 'vagtstatus.lon.v1' ? raa : null), setItem() {} };
  try {
    const d = await loadPayData();
    assert.equal(d.shifts.length, 1);
    assert.deepEqual([d.shifts[0].id, d.shifts[0].employer, d.shifts[0].date, d.shifts[0].start, d.shifts[0].end, d.shifts[0].unpaidBreakMinutes], ['a1', 'akut', '2026-10-18', '15:00', '23:00', 30]);
    assert.deepEqual(d.settings, DEFAULT_SETTINGS);
  } finally {
    if (before === undefined) delete g.localStorage; else g.localStorage = before;
  }
});

test('løndata gemmes under samme localStorage-nøgle og format', async () => {
  const store = new Map<string, string>();
  const g = globalThis as any;
  const before = g.localStorage;
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
  try {
    const data = normalisePayData(null);
    data.shifts.push(shift({}));
    await savePayData(data);
    assert.deepEqual([...store.keys()], ['vagtstatus.lon.v1']);
    assert.equal(JSON.parse(store.get('vagtstatus.lon.v1')!).version, 2);
    assert.deepEqual(await loadPayData(), normalisePayData(data));
  } finally {
    if (before === undefined) delete g.localStorage; else g.localStorage = before;
  }
});
