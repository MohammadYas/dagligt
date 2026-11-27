// Local-only UI harness. Synthetic files stay in memory; never calls Dropbox.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { bureauer, kontrol } from '../tests/fixtures/dropbox.mjs';
const root = resolve('dist');
const files = new Map(Object.entries({
  '/kontrol.txt': kontrol,
  '/dage.txt': '2026-09-25\nTeam Forlev\nTeam Sørby\n',
  '/torn_dage.txt': '2026-09-26\nTeam Nygade\n',
  '/bureauer.txt': bureauer,
  '/steder.txt': 'Teststed CAS = Teststed TØRN\n',
}));
const writes = [];
let failNext = false;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8091');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/__test/fail' && req.method === 'POST') { failNext = true; res.end('armed'); return; }
  if (url.pathname === '/__test/results') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ writes, files: Object.fromEntries(files) })); return; }
  if (url.pathname === '/api/dropbox') {
    const path = url.searchParams.get('sti');
    if (req.method === 'POST') {
      let text = ''; for await (const chunk of req) text += chunk;
      if (failNext) { failNext = false; res.writeHead(503); res.end('Simuleret netværksfejl'); return; }
      writes.push({ path, text }); files.set(path, text); res.end('ok'); return;
    }
    if (path?.startsWith('/status_')) {
      res.setHeader('x-skrevet', new Date().toISOString());
      res.end('Kører: JA\nLedige vagter: 12\nMatcher: 2\nTaget i alt: 1\nFejl i træk: 0\nMode: Lokale testdata\n'); return;
    }
    if (!files.has(path)) { res.writeHead(409); res.end('missing'); return; }
    res.end(files.get(path)); return;
  }
  if (url.pathname === '/sw.js') { res.writeHead(404); res.end(); return; }
  try {
    const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!file.startsWith(root + sep)) throw new Error('outside root');
    const body = await readFile(file); res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream'); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(8091, '127.0.0.1', () => console.log('Local fixture preview: http://127.0.0.1:8091/#n=local-preview'));
