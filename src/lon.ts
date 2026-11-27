export type Employer = 'multicare' | 'akut';
export type PayRates = { weekdayDay: number; weekdayEvening: number; weekdayNight: number; weekendDay: number; weekendEvening: number; weekendNight: number };
export type PaySettings = {
  rates: Record<Employer, PayRates>;
  primaryTaxCardEmployer: Employer;
  deductionPerPayPeriod: number;
  taxRate: number | null;
  amContributionRate: number;
};
export type Shift = {
  id: string;
  employer: Employer;
  date: string;
  start: string;
  end: string;
  unpaidBreakMinutes: number;
  createdAt: number;
  updatedAt: number;
  /** A shift keeps the rates it was created with, so later rate changes don't rewrite history. */
  rateSnapshot?: Record<Employer, PayRates>;
};
export type PayData = { version: 2; shifts: Shift[]; settings: PaySettings };
export type PayPeriod = { start: string; end: string; payday: string };
export type PaySegment = { date: string; start: string; end: string; minutes: number; weekend: boolean; band: 'day' | 'evening' | 'night' };
export type CalculatedSegment = PaySegment & { rate: number; paidMinutes: number; gross: number };
export type ShiftCalculation = { gross: number; totalMinutes: number; paidMinutes: number; segments: CalculatedSegment[] };
export type PeriodGross = { period: PayPeriod; earned: number; planned: number; gross: number; hours: number; byEmployer: Record<Employer, number>; shifts: { shift: Shift; calculation: ShiftCalculation; completed: boolean }[] };
export type TaxEstimate = { complete: boolean; gross: number; am: number; aTax: number | null; net: number | null; deductionUsed: number; byEmployer: Record<Employer, { gross: number; am: number; aTax: number | null; net: number | null }> };

export const EMPLOYER_LABEL: Record<Employer, string> = { multicare: 'Multicare', akut: 'Akut Hjælp' };
export const DEFAULT_SETTINGS: PaySettings = {
  rates: {
    multicare: { weekdayDay: 205, weekdayEvening: 250, weekdayNight: 250, weekendDay: 307.5, weekendEvening: 352.5, weekendNight: 352.5 },
    akut: { weekdayDay: 223, weekdayEvening: 273, weekdayNight: 273, weekendDay: 334.5, weekendEvening: 394.5, weekendNight: 394.5 },
  },
  primaryTaxCardEmployer: 'multicare',
  deductionPerPayPeriod: 3425,
  taxRate: 39,
  amContributionRate: 8,
};

const STORAGE_KEY = 'vagtstatus.lon.v1';
const DAY_MS = 86_400_000;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');

export function localDate(key: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error('Datoen skal skrives som ÅÅÅÅ-MM-DD.');
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (d.getFullYear() !== Number(match[1]) || d.getMonth() !== Number(match[2]) - 1 || d.getDate() !== Number(match[3])) throw new Error('Datoen findes ikke.');
  return d;
}
export function dateKey(date: Date): string { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
export function todayKey(date = new Date()): string { return dateKey(date); }
export function addDays(key: string, days: number): string { const d = localDate(key); d.setDate(d.getDate() + days); return dateKey(d); }
export function parseTime(value: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Error('Tid skal skrives som TT:MM.');
  return Number(m[1]) * 60 + Number(m[2]);
}
export function timeLabel(minutes: number): string { return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`; }
export function isoWeekInfo(input: Date | string): { year: number; week: number } {
  const base = typeof input === 'string' ? localDate(input) : new Date(input.getFullYear(), input.getMonth(), input.getDate(), 12);
  const isoDay = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() + 3 - isoDay);
  const year = base.getFullYear();
  const firstThursday = new Date(year, 0, 4, 12);
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
  return { year, week: 1 + Math.round((base.getTime() - firstThursday.getTime()) / (7 * DAY_MS)) };
}
export function getISOWeek(input: Date | string): number { return isoWeekInfo(input).week; }
function isoWeeksInYear(year: number): number { return getISOWeek(new Date(year, 11, 28, 12)); }
/** Continuous parity keeps periods exactly 14 days even through ISO week 53. */
function cycleWeekIndex(info: { year: number; week: number }): number {
  let total = info.week - 1;
  if (info.year >= 2000) for (let year = 2000; year < info.year; year++) total += isoWeeksInYear(year);
  else for (let year = info.year; year < 2000; year++) total -= isoWeeksInYear(year);
  return total;
}
function mondayFor(key: string): string { const d = localDate(key); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dateKey(d); }
export function getPayPeriodForDate(input: Date | string): PayPeriod {
  const key = typeof input === 'string' ? input : dateKey(input);
  const monday = mondayFor(key);
  const start = cycleWeekIndex(isoWeekInfo(monday)) % 2 === 0 ? monday : addDays(monday, -7);
  const end = addDays(start, 13);
  return { start, end, payday: addDays(end, 3) };
}
export function getPaydayForPeriod(period: Pick<PayPeriod, 'end'>): string { return addDays(period.end, 3); }
export function getNextPayday(input: Date | string = new Date()): string { return getPayPeriodForDate(input).payday; }
export function isWeekend(key: string): boolean { const day = localDate(key).getDay(); return day === 0 || day === 6; }

function shiftStart(shift: Pick<Shift, 'date' | 'start'>): Date { const d = localDate(shift.date); const m = parseTime(shift.start); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; }
function shiftEnd(shift: Pick<Shift, 'date' | 'start' | 'end'>): Date { const d = localDate(shift.date); const start = parseTime(shift.start), end = parseTime(shift.end); d.setHours(Math.floor(end / 60), end % 60, 0, 0); if (end <= start) d.setDate(d.getDate() + 1); return d; }
function bandFor(minutes: number): PaySegment['band'] { return minutes >= 7 * 60 && minutes < 15 * 60 ? 'day' : minutes >= 15 * 60 && minutes < 23 * 60 ? 'evening' : 'night'; }
export function splitShiftIntoPaySegments(shift: Pick<Shift, 'date' | 'start' | 'end'>): PaySegment[] {
  const current = shiftStart(shift); const end = shiftEnd(shift); const output: PaySegment[] = [];
  while (current.getTime() < end.getTime()) {
    const minute = current.getHours() * 60 + current.getMinutes();
    const boundary = [7 * 60, 15 * 60, 23 * 60, 24 * 60].find(value => value > minute) ?? 24 * 60;
    const next = new Date(current);
    if (boundary === 24 * 60) { next.setHours(0, 0, 0, 0); next.setDate(next.getDate() + 1); }
    else next.setHours(Math.floor(boundary / 60), boundary % 60, 0, 0);
    const stop = next.getTime() < end.getTime() ? next : end;
    const date = dateKey(current);
    output.push({ date, start: timeLabel(minute), end: timeLabel(stop.getHours() * 60 + stop.getMinutes()), minutes: Math.round((stop.getTime() - current.getTime()) / 60_000), weekend: isWeekend(date), band: bandFor(minute) });
    current.setTime(stop.getTime());
  }
  return output;
}
export function rateForSegment(employer: Employer, segment: PaySegment, settings: PaySettings): number {
  const rates = settings.rates[employer];
  const suffix = segment.band === 'day' ? 'Day' : segment.band === 'evening' ? 'Evening' : 'Night';
  return rates[`${segment.weekend ? 'weekend' : 'weekday'}${suffix}` as keyof PayRates];
}
export function calculateShiftGross(shift: Shift, settings: PaySettings): ShiftCalculation {
  const rates = shift.rateSnapshot ? { ...settings, rates: shift.rateSnapshot } : settings;
  const segments = splitShiftIntoPaySegments(shift);
  const totalMinutes = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  const unpaid = Math.max(0, Math.min(totalMinutes, Math.round(shift.unpaidBreakMinutes || 0)));
  const calculated = segments.map(segment => {
    const paidMinutes = totalMinutes ? segment.minutes - unpaid * segment.minutes / totalMinutes : 0;
    const rate = rateForSegment(shift.employer, segment, rates);
    return { ...segment, rate, paidMinutes, gross: round(paidMinutes / 60 * rate) };
  });
  return { gross: round(calculated.reduce((sum, segment) => sum + segment.gross, 0)), totalMinutes, paidMinutes: totalMinutes - unpaid, segments: calculated };
}
export function isShiftComplete(shift: Shift, now = new Date()): boolean { return shiftEnd(shift).getTime() <= now.getTime(); }
export function calculatePeriodGross(shifts: Shift[], period: PayPeriod, settings: PaySettings, now = new Date()): PeriodGross {
  const selected = shifts.filter(shift => getPayPeriodForDate(shift.date).start === period.start).map(shift => ({ shift, calculation: calculateShiftGross(shift, settings), completed: isShiftComplete(shift, now) }));
  const byEmployer: Record<Employer, number> = { multicare: 0, akut: 0 };
  let earned = 0, planned = 0, minutes = 0;
  for (const item of selected) { byEmployer[item.shift.employer] += item.calculation.gross; minutes += item.calculation.paidMinutes; if (item.completed) earned += item.calculation.gross; else planned += item.calculation.gross; }
  return { period, earned: round(earned), planned: round(planned), gross: round(earned + planned), hours: minutes / 60, byEmployer: { multicare: round(byEmployer.multicare), akut: round(byEmployer.akut) }, shifts: selected };
}
export function calculateTaxEstimate(byEmployer: Record<Employer, number>, settings: PaySettings): TaxEstimate {
  const taxRate = settings.taxRate;
  const result: TaxEstimate = { complete: taxRate !== null && Number.isFinite(taxRate), gross: 0, am: 0, aTax: taxRate === null ? null : 0, net: taxRate === null ? null : 0, deductionUsed: 0, byEmployer: { multicare: { gross: 0, am: 0, aTax: taxRate === null ? null : 0, net: taxRate === null ? null : 0 }, akut: { gross: 0, am: 0, aTax: taxRate === null ? null : 0, net: taxRate === null ? null : 0 } } };
  for (const employer of ['multicare', 'akut'] as Employer[]) {
    const gross = round(Math.max(0, byEmployer[employer] || 0));
    const am = round(gross * Math.max(0, settings.amContributionRate) / 100);
    const taxable = gross - am;
    const deduction = employer === settings.primaryTaxCardEmployer ? Math.min(taxable, Math.max(0, settings.deductionPerPayPeriod)) : 0;
    const aTax = result.complete ? round(Math.max(0, taxable - deduction) * (taxRate! / 100)) : null;
    const net = aTax === null ? null : round(gross - am - aTax);
    result.byEmployer[employer] = { gross, am, aTax, net };
    result.gross += gross; result.am += am; result.deductionUsed += deduction;
    if (aTax !== null) result.aTax = (result.aTax ?? 0) + aTax;
    if (net !== null) result.net = (result.net ?? 0) + net;
  }
  result.gross = round(result.gross); result.am = round(result.am); result.deductionUsed = round(result.deductionUsed);
  if (result.aTax !== null) result.aTax = round(result.aTax);
  if (result.net !== null) result.net = round(result.net);
  return result;
}
export function calculatePeriodNet(periodGross: PeriodGross, settings: PaySettings): TaxEstimate { return calculateTaxEstimate(periodGross.byEmployer, settings); }
export function upcomingPeriods(from: Date | string = new Date(), count = 6): PayPeriod[] {
  const periods: PayPeriod[] = []; let cursor = typeof from === 'string' ? from : dateKey(from);
  while (periods.length < count) { const period = getPayPeriodForDate(cursor); if (!periods.some(item => item.start === period.start)) periods.push(period); cursor = addDays(period.end, 1); }
  return periods;
}
/** The period paid out next: a finished period stays "next" until its payday has passed. */
export function naesteLoen(today: string): PayPeriod {
  const current = getPayPeriodForDate(today);
  const previous = getPayPeriodForDate(addDays(current.start, -1));
  return previous.payday >= today ? previous : current;
}
/** Paid-out periods that contain shifts, newest first. */
export function tidligereLoen(shifts: Shift[], today: string): PayPeriod[] {
  const periods = new Map(shifts.map(shift => { const p = getPayPeriodForDate(shift.date); return [p.start, p] as const; }));
  return [...periods.values()].filter(p => p.payday < today).sort((a, b) => b.start.localeCompare(a.start));
}
export function shortDate(key: string): string { return localDate(key).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }); }
export function longDate(key: string): string { return localDate(key).toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
export function formatKr(value: number): string { return new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 }).format(value); }
export function formatHours(value: number): string { return new Intl.NumberFormat('da-DK', { minimumFractionDigits: value % 1 ? 1 : 0, maximumFractionDigits: 1 }).format(value); }

function validRates(value: unknown): PayRates | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<PayRates>; const output = {} as PayRates;
  for (const key of ['weekdayDay', 'weekdayEvening', 'weekdayNight', 'weekendDay', 'weekendEvening', 'weekendNight'] as const) { if (!Number.isFinite(input[key]) || input[key]! < 0) return null; output[key] = input[key]!; }
  return output;
}
function normaliseShift(value: unknown): Shift | null {
  if (!value || typeof value !== 'object') return null;
  const shift = value as Partial<Shift>;
  if (!shift.id || (shift.employer !== 'multicare' && shift.employer !== 'akut') || !shift.date || !shift.start || !shift.end) return null;
  try { localDate(shift.date); parseTime(shift.start); parseTime(shift.end); } catch { return null; }
  return { id: shift.id, employer: shift.employer, date: shift.date, start: shift.start, end: shift.end, unpaidBreakMinutes: Math.max(0, Number(shift.unpaidBreakMinutes) || 0), createdAt: Number(shift.createdAt) || Date.now(), updatedAt: Number(shift.updatedAt) || Date.now(), rateSnapshot: shift.rateSnapshot && validRates(shift.rateSnapshot.multicare) && validRates(shift.rateSnapshot.akut) ? shift.rateSnapshot : undefined };
}
export function normalisePayData(value: unknown): PayData {
  const input = value && typeof value === 'object' ? value as Partial<PayData> : {};
  const settings = copy(DEFAULT_SETTINGS);
  const proposed = input.settings;
  if (proposed) {
    const multi = validRates(proposed.rates?.multicare), akut = validRates(proposed.rates?.akut);
    if (multi) settings.rates.multicare = multi; if (akut) settings.rates.akut = akut;
    if (proposed.primaryTaxCardEmployer === 'multicare' || proposed.primaryTaxCardEmployer === 'akut') settings.primaryTaxCardEmployer = proposed.primaryTaxCardEmployer;
    if (Number.isFinite(proposed.deductionPerPayPeriod) && proposed.deductionPerPayPeriod >= 0) settings.deductionPerPayPeriod = proposed.deductionPerPayPeriod;
    // Version 1 launched with an empty tax rate. Move that initial state to the user's 39% rate,
    // while version 2 still lets the user deliberately clear the field.
    if (input.version === 2 && proposed.taxRate === null) settings.taxRate = null;
    else if (typeof proposed.taxRate === 'number' && Number.isFinite(proposed.taxRate) && proposed.taxRate >= 0 && proposed.taxRate <= 100) settings.taxRate = proposed.taxRate;
    if (Number.isFinite(proposed.amContributionRate) && proposed.amContributionRate >= 0 && proposed.amContributionRate <= 100) settings.amContributionRate = proposed.amContributionRate;
  }
  return { version: 2, settings, shifts: Array.isArray(input.shifts) ? input.shifts.map(normaliseShift).filter((shift): shift is Shift => !!shift) : [] };
}
// Same key and raw JSON string that AsyncStorage wrote to localStorage on web.
const lager = () => (globalThis as { localStorage?: Pick<Storage, 'getItem' | 'setItem'> }).localStorage;
export async function loadPayData(): Promise<PayData> { try { return normalisePayData(JSON.parse(lager()?.getItem(STORAGE_KEY) || 'null')); } catch { return normalisePayData(null); } }
export async function savePayData(data: PayData): Promise<void> { lager()?.setItem(STORAGE_KEY, JSON.stringify(normalisePayData(data))); }
