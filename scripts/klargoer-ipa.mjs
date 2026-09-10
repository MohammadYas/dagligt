/**
 * Gør en IPA fra GitHub Actions klar til SideStore.
 *
 * CI bygger den native del uden nøgler — artefakter fra et offentligt repo
 * kan hentes af enhver, og Dropbox-refresh-tokenet udløber aldrig. JS-delen
 * bygges derfor her på maskinen med .env og byttes ind bagefter, så nøglerne
 * aldrig forlader computeren.
 *
 * Brug:  node scripts/klargoer-ipa.mjs <ipa-ind> <ipa-ud>
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, rmSync, readdirSync, statSync, cpSync, readFileSync,
} from 'node:fs';
import { join, resolve, basename } from 'node:path';
import AdmZip from 'adm-zip';

const args = process.argv.slice(2);
// Et gratis Apple-ID kan have tre sideloadede apps ad gangen, og en
// widget-extension taeller som sin egen. Uden den fylder appen én plads.
const udenWidget = args.includes('--uden-widget');
const [ind, ud] = args.filter((a) => !a.startsWith('--'));
if (!ind || !ud) {
  console.error('Brug: node scripts/klargoer-ipa.mjs [--uden-widget] <ipa-ind> <ipa-ud>');
  process.exit(1);
}

const rod = resolve(process.cwd());
const arbejde = join(rod, '.klargoer');
const bundt = join(rod, '.bundle-ud');

// 1. JS-bundtet bygges her, med .env indlæst af Expo.
console.log('==> Bygger JS-bundt med nøglerne fra .env');
rmSync(bundt, { recursive: true, force: true });
execFileSync(
  'npx',
  [
    'expo', 'export:embed',
    '--platform', 'ios',
    '--dev', 'false',
    '--entry-file', 'index.ts',
    '--bundle-output', join(bundt, 'main.jsbundle'),
    '--assets-dest', join(bundt, 'assets'),
  ],
  { stdio: 'inherit', shell: true },
);

const nyBundt = join(bundt, 'main.jsbundle');
if (!existsSync(nyBundt)) {
  console.error('FEJL: bundtet blev ikke skrevet.');
  process.exit(1);
}

const env = readFileSync(join(rod, '.env'), 'utf8');
const envVaerdi = (navn) => {
  const linje = env.split(/\r?\n/).find((l) => l.startsWith(navn + '='));
  return (linje ?? '').split('=').slice(1).join('=').trim();
};

// Nægt at lave en IPA uden nøgler — det er hele pointen med skridtet.
const indhold = readFileSync(nyBundt, 'utf8');
for (const navn of [
  'EXPO_PUBLIC_DROPBOX_APP_KEY',
  'EXPO_PUBLIC_DROPBOX_REFRESH_TOKEN',
  'EXPO_PUBLIC_DEEPSEEK_KEY',
]) {
  const vaerdi = envVaerdi(navn);
  if (!vaerdi) {
    console.error(`FEJL: ${navn} er tom i .env.`);
    process.exit(1);
  }
  if (!indhold.includes(vaerdi)) {
    console.error(`FEJL: ${navn} nåede ikke ind i bundtet.`);
    process.exit(1);
  }
}
console.log('==> Alle tre nøgler er i bundtet');

// 2. IPA'en pakkes ud.
console.log('==> Pakker IPA ud');
rmSync(arbejde, { recursive: true, force: true });
mkdirSync(arbejde, { recursive: true });
new AdmZip(resolve(ind)).extractAllTo(arbejde, true);

const apps = readdirSync(join(arbejde, 'Payload')).filter((n) => n.endsWith('.app'));
if (apps.length !== 1) {
  console.error('FEJL: forventede præcis én .app i Payload, fandt ' + apps.length);
  process.exit(1);
}
const app = join(arbejde, 'Payload', apps[0]);
const gammel = join(app, 'main.jsbundle');
const gammelStoerrelse = existsSync(gammel) ? statSync(gammel).size : 0;
console.log(`==> app: ${apps[0]}, bundt ${(gammelStoerrelse / 1048576).toFixed(1)} MB`);

// 3. Bundt og aktiver byttes.
console.log('==> Bytter JS-bundt og aktiver');
cpSync(nyBundt, gammel);
const nyeAktiver = join(bundt, 'assets');
if (existsSync(nyeAktiver)) {
  for (const post of readdirSync(nyeAktiver)) {
    cpSync(join(nyeAktiver, post), join(app, post), { recursive: true });
  }
}

// 4. Signaturrester skal væk — SideStore signerer selv.
function ryd(mappe) {
  for (const post of readdirSync(mappe, { withFileTypes: true })) {
    if (!post.isDirectory()) continue;
    const sti = join(mappe, post.name);
    if (post.name === '_CodeSignature') rmSync(sti, { recursive: true, force: true });
    else ryd(sti);
  }
}
ryd(arbejde);

// 4b. Widget-extensionen fjernes hvis den skal spare en app-plads.
if (udenWidget) {
  const plugins = join(app, 'PlugIns');
  if (existsSync(plugins)) {
    rmSync(plugins, { recursive: true, force: true });
    console.log('==> Widget fjernet — appen fylder én plads');
  }
}

// 5. Pakkes igen.
console.log('==> Pakker IPA');
const udFuld = resolve(ud);
rmSync(udFuld, { force: true });
const zip = new AdmZip();
zip.addLocalFolder(join(arbejde, 'Payload'), 'Payload');
zip.writeZip(udFuld);
rmSync(arbejde, { recursive: true, force: true });

// 6. Efterprøv resultatet frem for at antage det.
const kontrol = new AdmZip(udFuld);
const poster = kontrol.getEntries().map((e) => e.entryName);
const bundtPost = poster.find((n) => n.endsWith('/main.jsbundle'));
const signatur = poster.filter((n) => n.includes('_CodeSignature')).length;
const widget = poster.some((n) => n.includes('.appex/'));
const noegleIBundt = bundtPost
  ? kontrol.readAsText(bundtPost).includes(envVaerdi('EXPO_PUBLIC_DROPBOX_APP_KEY'))
  : false;

console.log('');
console.log('==> ' + basename(udFuld));
console.log(`    stoerrelse       ${(statSync(udFuld).size / 1048576).toFixed(1)} MB`);
console.log(`    main.jsbundle    ${bundtPost ? 'ja' : 'MANGLER'}`);
console.log(`    noegler i bundt  ${noegleIBundt ? 'ja' : 'NEJ'}`);
console.log(`    widget           ${widget ? 'ja' : 'nej (sparer en app-plads)'}`);
console.log(`    signaturrester   ${signatur}`);

if (udenWidget && widget) {
  console.error('FEJL: widget skulle vaere fjernet.');
  process.exit(1);
}

if (!bundtPost || !noegleIBundt || signatur > 0) {
  console.error('\nIPA er ikke klar.');
  process.exit(1);
}
