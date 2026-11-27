// SERVICE WORKER di DPSH Field Collector (solo versione web su https://dpsh.netlify.app).
// Tiene l'app disponibile senza rete e si aggiorna quando esce una versione nuova.
//  · __VERSIONE_CACHE__ è un segnaposto: tools/prepara_netlify.py lo riempie con l'impronta sha256 di
//    index.html. Versione nuova dell'app = nome di cache nuovo = questo file cambia = il browser lo nota.
//  · install: precache della pagina e dei file statici. NON si attiva da solo (niente skipWaiting): la
//    pagina mostra «Nuova versione disponibile: ricarica» e, se l'utente accetta, manda SKIP_WAITING.
//  · activate: cancella TUTTE le altre cache, compresa `dpsh-v5` del sito vecchio.
//  · navigazioni: prima la cache, intanto si aggiorna dalla rete in background.
//  · altre origini (mappe, IA, Google): mai intercettate e mai in cache.
const VERSIONE = '__VERSIONE_CACHE__';
const CACHE = 'dpsh-' + VERSIONE;
const PRECACHE = ['./', 'index.html', 'manifest.webmanifest',
  'icone/icona-192.png', 'icone/icona-512.png', 'icone/icona-maskable-192.png', 'icone/icona-maskable-512.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' = dalla rete, non dalla cache HTTP: la cache nuova deve contenere la pagina nuova.
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' }))))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(nomi => Promise.all(nomi.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING' || (e.data && e.data.tipo === 'SKIP_WAITING')) self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // altre origini: la rete, niente cache
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async (cache) => {
      const inCache = (await cache.match('index.html')) || (await cache.match('./'));
      const daRete = fetch(req).then((r) => { if (r && r.ok && r.type === 'basic') cache.put('index.html', r.clone()); return r; });
      if (inCache) { e.waitUntil(daRete.catch(() => {})); return inCache; }
      return daRete;
    }));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
