// Holder skallen i cache, saa appen aabner uden net.
// Kald til /api/ gaar altid til netvaerket — de skal vaere friske.
const CACHE = 'autovagt-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/'])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((navne) =>
      Promise.all(navne.filter((n) => n !== CACHE).map((n) => caches.delete(n))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then((svar) => {
        const kopi = svar.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopi)).catch(() => {});
        return svar;
      })
      .catch(() => caches.match(e.request).then((t) => t ?? caches.match('/'))),
  );
});
