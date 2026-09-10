// Holder skallen i cache, saa appen aabner uden net.
//
// Navigationer hentes altid forbi browserens egen cache: index.html peger
// paa et bundt med et indhold-hash i navnet, saa en gammel index.html
// laaser hele appen fast paa den gamle kode.
const CACHE = 'autovagt-v3';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add(new Request('/', { cache: 'reload' }))),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((navne) => Promise.all(navne.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  const erNavigation = e.request.mode === 'navigate';

  e.respondWith(
    fetch(erNavigation ? new Request(e.request, { cache: 'reload' }) : e.request)
      .then((svar) => {
        const kopi = svar.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopi)).catch(() => {});
        return svar;
      })
      .catch(() => caches.match(e.request).then((t) => t ?? caches.match('/'))),
  );
});

// Appen kan bede om at faa den nyeste version med det samme.
self.addEventListener('message', (e) => {
  if (e.data === 'opdater') self.skipWaiting();
});
