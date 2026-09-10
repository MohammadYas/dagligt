export type Script = 'cas' | 'torn';

export const FILER: Record<Script, { oensker: string; status: string; navn: string }> = {
  cas: { oensker: '/dage.txt', status: '/status_cas.txt', navn: 'Cas' },
  torn: { oensker: '/torn_dage.txt', status: '/status_torn.txt', navn: 'Tørn' },
};

export type Sted = { navn: string; aktiv: boolean };
export type Oensker = { datoer: string[]; steder: Sted[] };

const DATO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Laeser dage.txt. Linjer med # er slaaet fra, men huskes stadig, saa et
 * fravalgt sted kan vaelges til igen uden at skrive navnet forfra.
 */
export function parseOensker(raa: string): Oensker {
  const datoer: string[] = [];
  const steder: Sted[] = [];
  let iStederSektion = false;

  for (const linje of raa.split(/\r?\n/)) {
    const trimmet = linje.trim();
    if (!trimmet) continue;

    if (trimmet.includes('STEDER')) {
      iStederSektion = true;
      continue;
    }

    const udkommenteret = trimmet.startsWith('#');
    const indhold = udkommenteret ? trimmet.replace(/^#+\s*/, '') : trimmet;
    if (!indhold) continue;

    if (DATO.test(indhold)) {
      // En udkommenteret dato er fravalgt og skal ikke med.
      if (!udkommenteret && !datoer.includes(indhold)) datoer.push(indhold);
      continue;
    }

    // Filens vejledningstekst staar ogsaa bag #. Kun kommentarer i
    // steder-sektionen kan vaere fravalgte stednavne.
    if (udkommenteret && !(iStederSektion && erStednavn(indhold))) continue;
    if (!udkommenteret && !iStederSektion) continue;

    if (!steder.some((s) => s.navn === indhold)) {
      steder.push({ navn: indhold, aktiv: !udkommenteret });
    }
  }

  datoer.sort();
  return { datoer, steder };
}

/** Skelner stednavne fra forklarende kommentarer i steder-sektionen. */
function erStednavn(tekst: string): boolean {
  if (tekst.length > 40) return false;
  if (/[=:()#]/.test(tekst)) return false;
  if (/\.$/.test(tekst)) return false;
  if (/^[-–—]/.test(tekst)) return false;
  return /^[A-ZÆØÅ]/.test(tekst);
}

/** Skriver filen tilbage i den form scriptet forventer. */
export function serialiserOensker(o: Oensker): string {
  const l: string[] = [];
  l.push('# ============================================================');
  l.push('#  Styret fra VagtStatus-appen. Scriptet genlaeser hvert 5. minut.');
  l.push('# ============================================================');
  l.push('');
  l.push('# ---- DAGE du vil arbejde (format: AAAA-MM-DD) ----');
  l.push('# Ingen aktive datoer nedenfor = ALLE datoer tillades.');
  for (const d of [...o.datoer].sort()) l.push(d);
  l.push('');
  l.push('# ---- STEDER (et stednavn pr. linje) ----');
  l.push('# Linjer med # foran springes over.');
  for (const s of o.steder) l.push(s.aktiv ? s.navn : `# ${s.navn}`);
  l.push('');
  l.push('# ============================================================');
  l.push('#  HUSK: Scriptet tager kun vagter der STARTER 15:00-23:00');
  l.push('#  og aldrig to vagter samme dag.');
  l.push('# ============================================================');
  return l.join('\n') + '\n';
}

export type Status = {
  raa: string;
  koerer: boolean;
  fejl: number;
  sidsteTjek: Date | null;
  ledige: number | null;
  matcher: number | null;
  taget: string | null;
  mode: string | null;
  forgammel: boolean;
};

export function parseStatus(raa: string): Status {
  const find = (m: RegExp) => raa.match(m);

  const koererM = find(/Kører:\s*(JA|NEJ|STOPPET)/i);
  const fejlM = find(/Fejl i træk:\s*(\d+)/i);
  const tjekM = find(/Sidste tjek:\s*(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/i);
  // Statusfilerne bruger tankestreg, ikke bindestreg. Begge accepteres.
  const vagterM = find(/Ledige vagter:\s*(\d+)\s*[-–—]\s*Matcher:\s*(\d+)/i);
  const tagetM = find(/Taget i dag:\s*(\S+)/i);
  const modeM = find(/Mode:\s*(.+)/i);

  const sidsteTjek = tjekM ? new Date(`${tjekM[1]}T${tjekM[2]}`) : null;
  const alder = sidsteTjek ? Date.now() - sidsteTjek.getTime() : 0;

  return {
    raa,
    koerer: (koererM?.[1] ?? '').toUpperCase() === 'JA',
    fejl: fejlM ? parseInt(fejlM[1], 10) : 0,
    sidsteTjek,
    ledige: vagterM ? parseInt(vagterM[1], 10) : null,
    matcher: vagterM ? parseInt(vagterM[2], 10) : null,
    taget: tagetM?.[1] ?? null,
    mode: modeM?.[1]?.trim() ?? null,
    // Scriptet skriver hvert minut. Over 5 minutter betyder noget haenger.
    forgammel: Boolean(sidsteTjek) && alder > 5 * 60_000,
  };
}

export type Tilstand = 'ok' | 'advarsel' | 'fejl';

export function tilstand(s: Status): Tilstand {
  if (!s.koerer || s.fejl > 0) return 'fejl';
  if (s.forgammel) return 'advarsel';
  return 'ok';
}

export function siden(d: Date | null): string {
  if (!d) return 'ukendt';
  const sek = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sek < 60) return 'for få sekunder siden';
  const min = Math.floor(sek / 60);
  if (min < 60) return `for ${min} min siden`;
  const timer = Math.floor(min / 60);
  if (timer < 24) return `for ${timer} t siden`;
  return `for ${Math.floor(timer / 24)} d siden`;
}

/**
 * Fletter filens steder med det fulde katalog: alt fra kataloget vises,
 * ogsaa det der ikke staar i filen. Filen bestemmer hvad der er slaaet til.
 * Steder der kun findes i filen bevares til sidst, saa intet forsvinder.
 */
export function medKatalog(o: Oensker, katalog: string[]): Oensker {
  const fraFil = new Map(o.steder.map((s) => [s.navn, s.aktiv]));
  const set = new Set(katalog);

  const iKatalog: Sted[] = katalog.map((navn) => ({
    navn,
    aktiv: fraFil.get(navn) ?? false,
  }));
  const kunIFil = o.steder.filter((s) => !set.has(s.navn));

  return { ...o, steder: [...iKatalog, ...kunIFil] };
}
