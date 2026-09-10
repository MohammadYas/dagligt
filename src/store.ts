import AsyncStorage from '@react-native-async-storage/async-storage';

export type Task = { id: string; text: string; done: boolean; date: string };
export type LogEntry = { date: string; mood: number };
export type Capture = { id: string; text: string; ts: number };
export type DB = { tasks: Task[]; logs: LogEntry[]; captures: Capture[] };

const KEY = 'dagligapp.v1';
export const empty: DB = { tasks: [], logs: [], captures: [] };

export async function load(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

export async function save(db: DB) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

// Lokal dato, ikke UTC. toISOString ville rulle til næste dag efter kl. 22 dansk tid.
export function dayKey(d: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];

export function longDate(d: Date = new Date()) {
  return `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

export function greeting(d: Date = new Date()) {
  const h = d.getHours();
  if (h < 10) return 'Godmorgen';
  if (h < 18) return 'Goddag';
  return 'Godaften';
}

/** Antal dage i træk op til og med i dag hvor der findes en log. */
export function streak(logs: LogEntry[]) {
  const set = new Set(logs.map((l) => l.date));
  let n = 0;
  const d = new Date();
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Sidste n dage, ældst først. */
export function lastDays(n: number) {
  const out: string[] = [];
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    out.push(dayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
