/**
 * Gennemgang af hele appens logik og de tjenester den afhaenger af.
 * Koeres med: node --experimental-strip-types tests/alt.mts
 */
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';

const env0 = readFileSync('.env', 'utf8');
for (const linje of env0.split(/\r?\n/)) {
  const i = linje.indexOf('=');
  if (i > 0) process.env[linje.slice(0, i).trim()] = linje.slice(i + 1).trim();
}

const R = 'file:///C:/Users/mo/Desktop/dagligapp/src/';
const {
  parseOensker, serialiserMedSkabelon, medKatalog, parseStatus, tilstand,
  skiftDato, saetDatoer, siden, TAVS_EFTER_MS, FILER,
} = await import(R + 'vagter.ts');
const { alleNavne, GRUPPER, gruppeFor } = await import(R + 'steder.ts');
const { dayKey, longDate, greeting, streak, lastDays } = await import(R + 'store.ts');
const { kode, base32, fraTekst, tilbage } = await import(R + 'totp.ts');
const { soeg } = await import(R + 'dawa.ts');
const { planlaeg, kortLinks, tid, afstand } = await import(R + 'rute.ts');
const { rens } = await import(R + 'deepseek.ts');

let bestaaet = 0;
let fejlet = 0;
const fejlListe: string[] = [];

function ok(navn: string, betingelse: boolean, detalje = '') {
  if (betingelse) {
    bestaaet++;
    console.log(`  OK    ${navn}${detalje ? '  ' + detalje : ''}`);
  } else {
    fejlet++;
    fejlListe.push(navn);
    console.log(`  FEJL  ${navn}${detalje ? '  ' + detalje : ''}`);
  }
}

function afsnit(t: string) {
  console.log(`\n=== ${t} ===`);
}

const env = readFileSync('.env', 'utf8');
const v = (k: string) =>
  (env.split('\n').find((l) => l.startsWith(k + '=')) ?? '').split('=').slice(1).join('=').trim();

// --------------------------------------------------------------- dato/tid
afsnit('Dato og tid');
{
  const d = new Date(2026, 8, 10, 23, 30);
  ok('dayKey bruger lokal tid, ikke UTC', dayKey(d) === '2026-09-10', dayKey(d));
  ok('longDate paa dansk', longDate(d) === 'torsdag 10. september', longDate(d));
  ok('greeting foer 10', greeting(new Date(2026, 8, 10, 6)) === 'Godmorgen');
  ok('greeting eftermiddag', greeting(new Date(2026, 8, 10, 14)) === 'Goddag');
  ok('greeting aften', greeting(new Date(2026, 8, 10, 21)) === 'Godaften');
  ok('lastDays giver 14 og slutter i dag', lastDays(14).length === 14 && lastDays(14)[13] === dayKey());

  const iDag = dayKey();
  const iGaar = dayKey(new Date(Date.now() - 86400000));
  ok('streak taeller to dage i traek', streak([{ date: iDag, mood: 2 }, { date: iGaar, mood: 3 }]) === 2);
  ok('streak stopper ved hul', streak([{ date: iGaar, mood: 3 }]) === 0);
  ok('siden formaterer minutter', siden(new Date(Date.now() - 5 * 60000)) === 'for 5 min siden');
}

// ------------------------------------------------------------- statusfiler
afsnit('Statusfiler fra scripterne');
{
  const tankestreg = [
    'CAS VIKARBOOKING – STATUS',
    'Kører: JA (startet kl. 06:06)',
    `Sidste tjek: ${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 8)}`,
    'Ledige vagter: 14 – Matcher: 2',
    'Dine vagter: ingen',
    'Taget i alt: 0 (max 3 pr. dato)',
    'Fejl i træk: 0',
  ].join('\n');

  const s = parseStatus(tankestreg);
  ok('laeser tankestreg i "Ledige vagter"', s.ledige === 14 && s.matcher === 2, `${s.ledige}/${s.matcher}`);
  ok('laeser "Taget i alt" (ny ordlyd)', s.taget === '0', String(s.taget));
  ok('laeser "Dine vagter"', s.dine === 'ingen', String(s.dine));
  ok('frisk status er ok', tilstand(s) === 'ok');

  const gammel = parseStatus(tankestreg.replace(/Sidste tjek: .*/, 'Sidste tjek: 2020-01-01 00:00:00'));
  ok('gammel status bliver tavs', tilstand(gammel) === 'advarsel');
  ok('graensen er tre minutter', TAVS_EFTER_MS === 180000);

  const stoppet = parseStatus(tankestreg.replace('Kører: JA', 'Kører: STOPPET'));
  ok('stoppet script er fejl', tilstand(stoppet) === 'fejl');

  const medFejl = parseStatus(tankestreg.replace('Fejl i træk: 0', 'Fejl i træk: 4'));
  ok('fejl i traek er fejl', tilstand(medFejl) === 'fejl' && medFejl.fejl === 4);

  const gammelOrdlyd = parseStatus('Kører: JA\nTaget i dag: 1/3\nFejl i træk: 0');
  ok('gammel ordlyd "Taget i dag" virker stadig', gammelOrdlyd.taget === '1/3', String(gammelOrdlyd.taget));

  ok('filstier er de rigtige', FILER.cas.oensker === '/dage.txt' && FILER.torn.status === '/status_torn.txt');
}

// ----------------------------------------------------------------- oensker
afsnit('Oenskefilen: dage og steder');
{
  const fil = [
    '# ============================================================',
    '#  DINE ØNSKER – rediger denne fil mens scriptet kører!',
    '# ============================================================',
    '',
    '# ---- DAGE du vil arbejde (format: AAAA-MM-DD, én pr. linje) ----',
    '2026-09-14',
    '2026-09-16',
    '# 2026-09-15',
    '',
    '# ---- STEDER (ét stednavn pr. linje) ----',
    '# Sæt # foran et sted for at SPRINGE DET OVER.',
    'Team Forlev',
    '# Korsør Nat',
    '',
    '# ============================================================',
    '#  HUSK: Scriptet tager kun vagter der STARTER 15:00-23:00',
    '# ============================================================',
  ].join('\n');

  const o = parseOensker(fil);
  ok('valgte datoer laest', JSON.stringify(o.datoer) === '["2026-09-14","2026-09-16"]');
  ok('fravalgt dato huskes', JSON.stringify(o.fravalgte) === '["2026-09-15"]');
  ok('aktivt sted laest', o.steder.find((s: any) => s.navn === 'Team Forlev')?.aktiv === true);
  ok('fravalgt sted huskes', o.steder.find((s: any) => s.navn === 'Korsør Nat')?.aktiv === false);
  ok('kommentartekst bliver ikke til stednavn', !o.steder.some((s: any) => s.navn.includes('Sæt #')));

  const k = medKatalog(o, alleNavne());
  ok('kataloget fylder op til 31 steder', k.steder.length === 31, String(k.steder.length));
  ok('kun ét sted er taendt efter fletning', k.steder.filter((s: any) => s.aktiv).length === 1);

  const a = skiftDato(k, '2026-09-14');
  ok('fravalgt dag flytter til huskede', !a.datoer.includes('2026-09-14') && a.fravalgte.includes('2026-09-14'));
  const b = skiftDato(a, '2026-09-15');
  ok('husket dag kan vaelges til igen', b.datoer.includes('2026-09-15') && !b.fravalgte.includes('2026-09-15'));
  const c = saetDatoer(b, ['2026-09-20']);
  ok('genvej husker det den skubber ud', c.datoer.length === 1 && c.fravalgte.length >= 2);

  const ud = serialiserMedSkabelon(fil, c);
  const kommentarer = (t: string) =>
    t.split('\n').filter((l) => /^#/.test(l.trim()) && !/^#\s*(\d{4}-|Team |Korsør |Slagelse |Skælskør )/.test(l.trim()));
  ok('alle kommentarlinjer overlever ordret',
    JSON.stringify(kommentarer(fil)) === JSON.stringify(kommentarer(ud)));
  ok('fravalgte dage skrives med #', ud.includes('# 2026-09-14') && ud.includes('# 2026-09-16'));
  ok('valgt dag skrives rent', /^2026-09-20$/m.test(ud));

  const igen = parseOensker(ud);
  ok('rundtur bevarer datoer', JSON.stringify(igen.datoer) === JSON.stringify(c.datoer));
  ok('intet sted gaar tabt', c.steder.every((s: any) => ud.includes(s.navn)));
}

// ------------------------------------------------------------------ steder
afsnit('Stedkatalog');
{
  ok('fem adresser', GRUPPER.length === 5, String(GRUPPER.length));
  ok('31 steder i alt', alleNavne().length === 31, String(alleNavne().length));
  ok('19 er standard', GRUPPER.flatMap((g: any) => g.steder).filter((s: any) => s.standard).length === 19);
  ok('ingen dubletter', new Set(alleNavne()).size === 31);
  ok('parkeringsnote sidder paa Sdr. Stationsvej',
    GRUPPER.find((g: any) => g.adresse.startsWith('Sdr.'))?.note?.includes('parkering') === true);
  ok('gruppeFor finder Team Nygade', gruppeFor('Team Nygade')?.adresse === 'Linde Allé 56');
  ok('gruppeFor giver null for ukendt', gruppeFor('Team Findes Ikke') === null);
}

// -------------------------------------------------------------------- totp
afsnit('Engangskoder (RFC 6238)');
{
  const ASCII = '12345678901234567890';
  const b32 = (() => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, val = 0, o = '';
    for (const ch of Buffer.from(ASCII)) {
      val = (val << 8) | ch; bits += 8;
      while (bits >= 5) { o += A[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits) o += A[(val << (5 - bits)) & 31];
    return o;
  })();

  const vektorer: [number, string][] = [
    [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
    [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
  ];
  for (const [t, forventet] of vektorer) {
    ok(`vektor t=${t}`, kode(b32, t * 1000, 8) === forventet);
  }

  const nu = Date.now();
  const c = Math.floor(nu / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(c));
  const h = createHmac('sha1', Buffer.from(ASCII)).update(buf).digest();
  const off = h[19] & 0xf;
  const n = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  ok('enig med node:crypto', String(n % 1e6).padStart(6, '0') === kode(b32, nu));

  ok('otpauth-URI laeses', fraTekst('otpauth://totp/GitHub:mo?secret=JBSWY3DPEHPK3PXP&issuer=GitHub')?.hemmelighed === 'JBSWY3DPEHPK3PXP');
  ok('raa hemmelighed med mellemrum laeses', fraTekst('jbsw y3dp ehpk 3pxp')?.hemmelighed === 'jbswy3dpehpk3pxp');
  ok('skrald afvises', fraTekst('hej med dig') === null);
  ok('base32 afviser ugyldigt tegn', (() => { try { base32('AAAA1111'); return false; } catch { return true; } })());
  ok('nedtaelling er 1-30', tilbage() >= 1 && tilbage() <= 30);
}

// ------------------------------------------------------------- tjenester
afsnit('Dropbox');
{
  const svar = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${v('EXPO_PUBLIC_DROPBOX_REFRESH_TOKEN')}&client_id=${v('EXPO_PUBLIC_DROPBOX_APP_KEY')}&client_secret=${v('EXPO_PUBLIC_DROPBOX_APP_SECRET')}`,
  });
  const tok = await svar.json();
  ok('refresh-token giver adgangstoken', typeof tok.access_token === 'string');

  for (const sti of ['/status_cas.txt', '/status_torn.txt', '/dage.txt', '/torn_dage.txt']) {
    const r = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + tok.access_token, 'Dropbox-API-Arg': JSON.stringify({ path: sti }) },
    });
    ok(`henter ${sti}`, r.ok, `HTTP ${r.status}`);
  }

  const s = parseStatus(await (await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok.access_token, 'Dropbox-API-Arg': JSON.stringify({ path: '/status_cas.txt' }) },
  })).text());
  ok('rigtig statusfil parses', s.ledige !== null, `${s.ledige} ledige, tilstand ${tilstand(s)}`);
}

afsnit('DeepSeek: appens egen rensning');
{
  const kort = await rens('kaffe');
  ok('ét ord bliver ikke til et afsnit', kort.tekst.length < 40, JSON.stringify(kort));

  const rodet = await rens('øhm altså jeg tænkte at måske kunne man ligesom sætte en påmindelse på når vagterne bliver lagt op tror det er torsdag ved 10 tiden');
  ok('rodet tanke bliver til en titel', kort.titel.length > 0 && rodet.titel.split(' ').length <= 7, rodet.titel);
  ok('rodet tanke bliver til hele saetninger', /[.!?]$/.test(rodet.tekst.trim()), rodet.tekst);
  ok('indholdet bevares', /påmindelse|vagter/i.test(rodet.tekst));
}

afsnit('DAWA');
{
  const f = await soeg('Hashøjvej 7, 4200');
  ok('finder adresse', f.length > 0);
  ok('koordinater med', typeof f[0]?.lon === 'number' && typeof f[0]?.lat === 'number');
  ok('etiket er ren', f[0]?.tekst === 'Hashøjvej 7, 4200 Slagelse', f[0]?.tekst);

  const landsby = await soeg('Havrebjergvej 1');
  ok('landsbynavnet er med', landsby[0]?.bynavn === 'Havrebjerg', String(landsby[0]?.tekst));

  const dalmose = await soeg('Nyvej 1, Dalmose');
  ok('Dalmose lander i Slagelse Kommune', dalmose[0]?.post?.includes('4261') === true, String(dalmose[0]?.tekst));
  ok('lokale adresser er ikke udenbys', dalmose[0]?.udenbys === false);

  const rude = await soeg('Østervej 4, Rude');
  ok('Rude er 4243, ikke Holte', rude[0]?.post?.includes('4243') === true, String(rude[0]?.tekst));
}

afsnit('Ruteberegning');
{
  const raa = [
    'Hashøjvej 7, 4200 Slagelse',
    'Næstvedvej 15, 4230 Skælskør',
    'Smedegade 32, 4200 Slagelse',
    'Linde Allé 56, 4220 Korsør',
  ];
  const stop: any[] = [];
  for (const a of raa) {
    const f = await soeg(a);
    if (f[0]) stop.push({ id: String(stop.length), tekst: f[0].tekst, lon: f[0].lon, lat: f[0].lat });
  }
  ok('alle fire adresser slaaet op', stop.length === 4);

  const rute = await planlaeg(stop);
  ok('rute beregnet paa vejnettet', rute.rigtigeTider, `${tid(rute.sekunder)} / ${afstand(rute.meter)}`);
  ok('alle stop med i ruten', rute.orden.length === stop.length);
  ok('foerste stop staar fast', rute.orden[0].id === stop[0].id);
  ok('sidste stop staar fast', rute.orden[rute.orden.length - 1].id === stop[stop.length - 1].id);

  const somListen = stop.map((s) => `${s.lon},${s.lat}`).join(';');
  const r = await (await fetch(`https://router.project-osrm.org/route/v1/driving/${somListen}?overview=false`)).json();
  ok('optimeret er ikke langsommere end listen',
    rute.sekunder <= Math.round(r.routes[0].duration) + 1,
    `${tid(rute.sekunder)} mod ${tid(r.routes[0].duration)}`);

  const links = kortLinks(rute.orden);
  ok('ét link til fire stop', links.length === 1);
  ok('linket har origin, destination og waypoints',
    links[0].includes('origin=') && links[0].includes('destination=') && links[0].includes('waypoints='));

  const mange = Array.from({ length: 25 }, (_, i) => ({ ...stop[i % 4], id: 's' + i }));
  ok('25 stop deles i etaper', kortLinks(mange).length === 3, String(kortLinks(mange).length));

  ok('tid formaterer timer', tid(3720) === '1 t 2 min', tid(3720));
  ok('afstand formaterer km', afstand(51000) === '51.0 km', afstand(51000));
  ok('ét stop giver intet link', kortLinks([stop[0]]).length === 0);
}

// ----------------------------------------------------------------- resultat
console.log(`\n${'='.repeat(52)}`);
console.log(`  ${bestaaet} bestaaet, ${fejlet} fejlet`);
if (fejlet) {
  console.log('\n  Fejlede:');
  fejlListe.forEach((f) => console.log('   - ' + f));
}
console.log(`${'='.repeat(52)}\n`);
process.exit(fejlet ? 1 : 0);
