/**
 * Efterbehandler Expos web-eksport, så den kan lægges på hjemmeskærmen.
 *
 * Expo skriver en index.html uden manifest, uden ikoner og uden de
 * iOS-specifikke meta-tags. De sættes ind her frem for at forgrene
 * Expos egen skabelon.
 */
import { readFileSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const rod = resolve(process.cwd());
const dist = join(rod, 'dist');
const web = join(rod, 'web');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('FEJL: dist/index.html findes ikke. Kør expo export først.');
  process.exit(1);
}

// Manifest, ikoner, service worker og robots kopieres med.
for (const post of ['manifest.webmanifest', 'sw.js', 'robots.txt', 'ikoner']) {
  const fra = join(web, post);
  if (existsSync(fra)) cpSync(fra, join(dist, post), { recursive: true });
}

const hoved = `
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Auto Vagt">
    <meta name="theme-color" content="#131211">
    <meta name="robots" content="noindex, nofollow">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" sizes="180x180" href="/ikoner/ikon-180.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/ikoner/ikon-152.png">
    <link rel="apple-touch-icon" sizes="120x120" href="/ikoner/ikon-120.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/ikoner/ikon-192.png">
    <style>
      html, body { background: #131211; }
      /* Bundlinjen skal ikke ligge under hjemme-indikatoren. */
      #root { padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }
      /* Overrulling i standalone-tilstand ser forkert ud paa en app-flade. */
      body { overscroll-behavior-y: none; }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

const sti = join(dist, 'index.html');
let html = readFileSync(sti, 'utf8');

if (html.includes('manifest.webmanifest')) {
  console.log('==> index.html var allerede behandlet');
} else {
  html = html.replace('</head>', hoved + '  </head>');
  html = html.replace(/<title>[^<]*<\/title>/, '<title>Auto Vagt</title>');
  if (!/<title>/.test(html)) html = html.replace('</head>', '  <title>Auto Vagt</title>\n  </head>');
  writeFileSync(sti, html);
  console.log('==> index.html udvidet med manifest, ikoner og service worker');
}

console.log('==> dist er klar');
