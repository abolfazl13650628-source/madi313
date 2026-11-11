/* Service Worker — hirkani-v8: HTML همیشه از شبکه، بقیه کش */
const V = 'hirkani-v9';
const SHELL = ['./', './index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'forest.jpg'];
const PRE = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js'
];
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'tessdata.projectnaptha.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const good = r => r && (r.ok || r.type === 'opaque');

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    await Promise.all(PRE.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;
  const same = url.origin === location.origin;
  if (!same && !CDN.includes(url.hostname)) return;

  // HTML / navigate: همیشه اول شبکه (تا آپدیت صدا فوری اعمال شود)
  const isHTML = same && (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname === '');
  if (isHTML) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: 'no-store' });
        if (good(r)) {
          const c = await caches.open(V);
          c.put(req, r.clone()).catch(() => {});
          return r;
        }
      } catch (_) {}
      const c = await caches.open(V);
      return (await c.match(req, { ignoreSearch: true })) || (await c.match('./')) || Response.error();
    })());
    return;
  }

  if (same) {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (good(r)) c.put(req, r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      const r = await net;
      return r || Response.error();
    })());
    return;
  }

  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (good(r)) c.put(req, r.clone());
      return r;
    } catch (_) { return Response.error(); }
  })());
});
