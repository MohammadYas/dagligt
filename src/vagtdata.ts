export type Kontrol = { cas: boolean; torn: boolean };
export type Dage = { datoer: string[]; steder: string[] };
export type Bureau = { navn: string; aktiv: boolean };
export type Navnepar = { a: string; b: string };
export type VagtData = { kontrol: Kontrol; cas: Dage; torn: Dage; bureauer: Bureau[]; par: Navnepar[] };
export type FilKey = keyof VagtData;
export const STIER: Record<FilKey, string> = { kontrol: '/kontrol.txt', cas: '/dage.txt', torn: '/torn_dage.txt', bureauer: '/bureauer.txt', par: '/steder.txt' };
const linjer = (s: string) => s.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const afslut = (s: string[]) => s.length ? s.join('\n') + '\n' : '';
export const normaliser = (s: string) => s.trim().toLocaleLowerCase('da-DK');

export function navn(s: string): string {
  const n = s.trim();
  if (!n || /[\r\n=#\u0000-\u001f]/.test(n) || /^\d{4}-\d{2}-\d{2}$/.test(n)) throw new Error('Skriv et navn uden linjeskift, # eller =.');
  return n;
}
function unikke(s: string[]): string[] {
  const r = s.map(navn);
  if (new Set(r.map(normaliser)).size !== r.length) throw new Error('Det samme navn står flere gange.');
  return r;
}
export function dato(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Vælg en gyldig dato.');
  const d = new Date(s + 'T12:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error('Vælg en gyldig dato.');
  return s;
}
export function parseKontrol(s: string): Kontrol {
  const rows = linjer(s).filter(l => !l.startsWith('#'));
  const values = new Map<string, boolean>();
  for (const l of rows) {
    const m = /^(CAS|TØRN):\s*(ON|OFF)$/i.exec(l);
    if (!m || values.has(m[1].toUpperCase())) throw new Error('Hovedkontakterne kunne ikke læses. Prøv at hente igen.');
    values.set(m[1].toUpperCase(), m[2].toUpperCase() === 'ON');
  }
  if (values.size !== 2) throw new Error('Begge hovedkontakter skal kunne læses, før du kan ændre dem.');
  return { cas: values.get('CAS')!, torn: values.get('TØRN')! };
}
export const skrivKontrol = (k: Kontrol) => `CAS: ${k.cas ? 'ON' : 'OFF'}\nTØRN: ${k.torn ? 'ON' : 'OFF'}\n`;
export function parseDage(s: string): Dage {
  const rows = linjer(s).filter(l => !l.startsWith('#'));
  return { datoer: [...new Set(rows.filter(l => /^\d{4}-\d{2}-\d{2}$/.test(l)).map(dato))].sort(), steder: unikke(rows.filter(l => !/^\d{4}-\d{2}-\d{2}$/.test(l))) };
}
export const skrivDage = (o: Dage) => afslut([...new Set(o.datoer.map(dato))].sort().concat(unikke(o.steder)));
// In this file, # marks BOTH disabled agencies and these explanatory headers.
// Do not discard all comments: that would lose the switches for disabled agencies.
const bureauVejledning = (line: string) => /^#\s*(?:[-=#]|ARBEJDSPLADSER\s*[–—:-]|Sæt\s+#\s+foran\b)/i.test(line);
export function parseBureauer(s: string): Bureau[] {
  const rows = linjer(s).filter(l => !bureauVejledning(l)).map(l => ({ navn: navn(l.replace(/^#\s*/, '')), aktiv: !l.startsWith('#') }));
  unikke(rows.map(r => r.navn));
  return rows;
}
export function skrivBureauer(rows: Bureau[], template = ''): string {
  const names = unikke(rows.map(r => r.navn));
  return afslut([...linjer(template).filter(bureauVejledning), ...rows.map((r, i) => (r.aktiv ? '' : '# ') + names[i])]);
}
export function parsePar(s: string): Navnepar[] {
  return linjer(s).filter(l => !l.startsWith('#')).map(l => {
    const parts = l.split('=');
    if (parts.length !== 2) throw new Error('Et stednavne-par kunne ikke læses. Prøv at hente igen.');
    return { a: navn(parts[0]), b: navn(parts[1]) };
  });
}
export function skrivPar(rows: Navnepar[]): string {
  unikke(rows.map(r => r.a));
  unikke(rows.map(r => r.b));
  return afslut(rows.map(r => `${navn(r.a)} = ${navn(r.b)}`));
}
export function laes<K extends FilKey>(key: K, raw: string): VagtData[K] {
  const readers = { kontrol: parseKontrol, cas: parseDage, torn: parseDage, bureauer: parseBureauer, par: parsePar };
  return readers[key](raw) as VagtData[K];
}
export function skriv<K extends FilKey>(key: K, value: VagtData[K], template?: string): string {
  switch (key) {
    case 'kontrol': return skrivKontrol(value as Kontrol);
    case 'cas': case 'torn': return skrivDage(value as Dage);
    case 'bureauer': return skrivBureauer(value as Bureau[], template);
    case 'par': return skrivPar(value as Navnepar[]);
  }
  throw new Error('Ukendt indstilling.');
}
