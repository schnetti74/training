// Service Worker: App funktioniert offline (Fitnessstudio-Empfang!) und aktualisiert sich selbst.
const CACHE = 'trainings-tracker-v3';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Seite (index.html): zuerst Netz, damit Updates sofort erscheinen; offline aus dem Cache.
// Übrige Dateien (Icons, Manifest): Cache zuerst, im Hintergrund aktualisieren.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || req.destination === 'document';
  e.respondWith(
    caches.open(CACHE).then(cache => {
      if (isPage) {
        return fetch(req, {cache: 'no-cache'}).then(res => {
          if (res && res.ok) cache.put('index.html', res.clone());
          return res;
        }).catch(() => cache.match('index.html', {ignoreSearch: true}).then(h => h || cache.match('./')));
      }
      return cache.match(req, {ignoreSearch: true}).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      });
    })
  );
});
