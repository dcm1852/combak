/* COMBAK — Service Worker v3 */
const CACHE  = 'combak-v3';
const BASE   = '/combak';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/app.js',
  BASE + '/sync.js',
  BASE + '/style.css',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // NO interceptar autenticación Microsoft ni Graph API
  // Si el SW intercepta estos requests, rompe el redirect de login
  if (
    url.includes('login.microsoftonline.com') ||
    url.includes('login.microsoft.com')       ||
    url.includes('graph.microsoft.com')       ||
    url.includes('alcdn.msauth.net')          ||
    url.includes('alcdn.msftauth.net')        ||
    url.includes('cdn.jsdelivr.net')
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(BASE + '/index.html'));
    })
  );
});
