export type Script = 'cas' | 'torn';

export const FILER: Record<Script, { oensker: string; status: string; navn: string }> = {
  cas: { oensker: '/dage.txt', status: '/status_cas.txt', navn: 'Cas' },
  torn: { oensker: '/torn_dage.txt', status: '/status_torn.txt', navn: 'Tørn' },
};

export type Sted = { navn: string; aktiv: boolean };
export type Oensker = {
  /** Datoer der er slaaet til. */
  datoer: string[];
  /** Datoer der har vaeret valgt, men er slaaet fra. Skrives som "# dato". */
  fravalgte: string[];
  steder: Sted[];
};

const DATO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Laeser dage.txt. Linjer med # er slaaet fra, men huskes stadig, saa et
 * fravalgt sted kan vaelges til igen uden at skrive navnet forfra.
 */
export function parseOensker(raa: string): Oensker {
  const datoer: string[] = [];
  const fravalgte: string[] = [];
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
      // En udkommenteret dato er fravalgt, men bliver husket.
      if (udkommenteret) {
        if (!fravalgte.includes(indhold)) fravalgte.push(indhold);
      } else if (!datoer.includes(indhold)) {
        datoer.push(indhold);
      }
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
  fravalgte.sort();
  return { datoer, fravalgte, steder };
}

/**
 * Skifter en dato til eller fra uden at glemme den. En fravalgt dato
 * flytter til fravalgte-listen, saa den stadig staar i filen som "# dato".
 */
export function skiftDato(o: Oensker, dato: string): Oensker {
  const til = o.datoer.includes(dato);
  return til
    ? {
        ...o,
        datoer: o.datoer.filter((d) => d !== dato),
        fravalgte: o.fravalgte.includes(dato) ? o.fravalgte : [...o.fravalgte, dato].sort(),
      }
    : {
        ...o,
        datoer: [...o.datoer, dato].sort(),
        fravalgte: o.fravalgte.filter((d) => d !== dato),
      };
}

/** Saetter hele listen af valgte dage. Alt der falder ud bliver husket. */
export function saetDatoer(o: Oensker, nye: string[]): Oensker {
  const sat = new Set(nye);
  const husk = new Set([...o.fravalgte, ...o.datoer].filter((d) => !sat.has(d)));
  return { ...o, datoer: [...sat].sort(), fravalgte: [...husk].sort() };
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
  l.push('#  Styret fra Auto Vagt. Scriptet genlaeser hvert 5. minut.');
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
  dine: string | null;
  forgammel: boolean;
};

/**
 * Scripterne skriver status hvert minut. Tre manglende indmeldinger
 * er nok til at kalde det tavst — én forsinket runde er normalt.
 */
export const TAVS_EFTER_MS = 3 * 60_000;

export function parseStatus(raa: string): Status {
  const find = (m: RegExp) => raa.match(m);

  const koererM = find(/Kører:\s*(JA|NEJ|STOPPET)/i);
  const fejlM = find(/Fejl i træk:\s*(\d+)/i);
  const tjekM = find(/Sidste tjek:\s*(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/i);
  // Statusfilerne bruger tankestreg, ikke bindestreg. Begge accepteres.
  const vagterM = find(/Ledige vagter:\s*(\d+)\s*[-–—]\s*Matcher:\s*(\d+)/i);
  const tagetM = find(/Taget i (?:dag|alt):\s*(\d+(?:\/\d+)?)/i);
  const dineM = find(/Dine vagter:\s*(.+)/i);
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
    dine: dineM?.[1]?.trim() ?? null,
    forgammel: Boolean(sidsteTjek) && alder > TAVS_EFTER_MS,
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

/**
 * Skriver oensker tilbage i filens EGEN form: hver kommentarlinje og
 * overskrift bevares ord for ord, og kun datoer og stednavne skiftes ud.
 * Sikrer at scriptet ser den fil det plejer, uanset hvad appen mener.
 */
export function serialiserMedSkabelon(raa: string, o: Oensker): string {
  const linjer = raa.split(/\r?\n/);
  const ud: string[] = [];

  const kendteSteder = new Map(o.steder.map((s) => [s.navn, s.aktiv]));
  const skrevne = new Set<string>();

  let datoerSkrevet = false;
  let sidsteStedIndeks = -1;

  for (const linje of linjer) {
    const trimmet = linje.trim();
    const udkommenteret = trimmet.startsWith('#');
    const indhold = udkommenteret ? trimmet.replace(/^#+\s*/, '') : trimmet;

    if (indhold && DATO.test(indhold)) {
      // Hele datoblokken skrives paa den foerste datolinjes plads:
      // valgte som de er, fravalgte bag et # saa de ikke gaar tabt.
      if (!datoerSkrevet) {
        for (const d of [...o.datoer].sort()) ud.push(d);
        for (const d of [...o.fravalgte].sort()) {
          if (!o.datoer.includes(d)) ud.push('# ' + d);
        }
        datoerSkrevet = true;
      }
      continue;
    }

    if (indhold && kendteSteder.has(indhold)) {
      ud.push(kendteSteder.get(indhold) ? indhold : `# ${indhold}`);
      skrevne.add(indhold);
      sidsteStedIndeks = ud.length - 1;
      continue;
    }

    ud.push(linje);
  }

  // Steder som filen ikke kendte i forvejen laegges efter det sidste den kendte.
  const nye = o.steder.filter((s) => !skrevne.has(s.navn));
  if (nye.length) {
    const raekker = nye.map((s) => (s.aktiv ? s.navn : `# ${s.navn}`));
    if (sidsteStedIndeks >= 0) ud.splice(sidsteStedIndeks + 1, 0, ...raekker);
    else ud.push(...raekker);
  }

  // Har filen slet ingen datolinjer, skal de valgte stadig med.
  if (!datoerSkrevet && (o.datoer.length || o.fravalgte.length)) {
    ud.push('', ...[...o.datoer].sort(), ...[...o.fravalgte].sort().map((d) => '# ' + d));
  }

  return ud.join('\n').replace(/\n*$/, '\n');
}
