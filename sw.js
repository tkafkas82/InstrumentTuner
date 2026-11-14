const CACHE = 'instrument-tuner-v2';
const ASSETS = ['./', 'index.html', 'pitch.js', 'manifest.webmanifest', 'icon.svg'];

self.addEventListener('install', e => {
  // fetch+put rather than cache.addAll: one flaky asset shouldn't fail the whole install
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a =>
    fetch(a, { cache: 'no-cache' }).then(r => r.ok && c.put(a, r)).catch(() => {})
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Network-first so updates show up, cache as offline fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
