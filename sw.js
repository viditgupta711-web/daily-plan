/* Master Daily Plan — service worker (offline + installable).
   Bump VERSION whenever you change the app to force clients to update. */
const VERSION = 'mdp-v3.1';
const SHELL   = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const PRECACHE = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live weather / geocoding must always hit the network — never cache these.
  if (url.hostname.includes('open-meteo.com') || url.hostname.includes('bigdatacloud.net')) return;

  // Page loads: network first, fall back to the cached app when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (local assets + the Tailwind CDN): cache first, then network + cache.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
