// Keeps the app itself (not the diagrams, the page handles those) available with no signal.
// Always tries the network first so changes on GitHub show up right away,
// and falls back to the saved copy when there's no signal.
// Bump this when you change index.html so phones pick up the new version.
const SHELL = 'wl-shell-v2';
const FILES = ['./', './index.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './lib/pdf.min.mjs', './lib/pdf.worker.min.mjs'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wl-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Same-site files: ask GitHub first (it answers "unchanged" cheaply), use the saved copy
// if there's no answer within 4 seconds. The library API (script.google.com) is never touched here.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/__wl-doc/')) return;
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const saved = cache.match(req, { ignoreSearch: true });
    const network = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 4000));
    try {
      const res = await Promise.race([network, timeout]);
      if (res) return res;
    } catch { /* offline: fall through to the saved copy */ }
    return (await saved) || network;
  })());
});
