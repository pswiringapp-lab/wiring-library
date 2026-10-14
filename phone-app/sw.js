// Keeps the app itself (not the diagrams, the page handles those) available with no signal.
// Bump this when you change index.html so phones pick up the new version.
const SHELL = 'wl-shell-v1';
const FILES = ['./', './index.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './lib/pdf.min.mjs', './lib/pdf.worker.min.mjs'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wl-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Same-site files: answer from the cache right away, refresh the cache in the background.
// The library API (script.google.com) is never touched here.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.includes('/__wl-doc/')) return;
  e.respondWith(caches.open(SHELL).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
});
