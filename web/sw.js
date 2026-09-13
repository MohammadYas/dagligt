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

// Varsel naar Toern-scripter tier. Selve tjekket ligger i en
// Netlify-funktion der sender push; her vises kun beskeden.
self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {}

  e.waitUntil(
    self.registration.showNotification(data.titel ?? 'Auto Vagt', {
      body: data.tekst ?? '',
      icon: '/ikoner/ikon-192.png',
      badge: '/ikoner/ikon-192.png',
      tag: 'torn-tavs',
    }),
  );
});

// Et tryk paa varselet aabner appen.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((vinduer) => {
        for (const v of vinduer) {
          if ('focus' in v) return v.focus();
        }
        return self.clients.openWindow('/');
      }),
  );
});
