/* Generated offline-first precache Service Worker */
const CACHE_NAME = 'ssw-shukuhaku-v1';
const PRECACHE_URLS = [
  "/",
  "/404",
  "/404.html",
  "/_next/static/chunks/0453825f-c8a6ffc8aac4ea8b.js",
  "/_next/static/chunks/251-356292513e7c1543.js",
  "/_next/static/chunks/27163a17-7f2cf2e03880b271.js",
  "/_next/static/chunks/309-2e6eb18b2073f47d.js",
  "/_next/static/chunks/4a8527dd-c003ccdc7c52c9a6.js",
  "/_next/static/chunks/559-78ec8dc72c5d76bd.js",
  "/_next/static/chunks/708-370c4c892f67ed41.js",
  "/_next/static/chunks/869-7b2fc267910dec64.js",
  "/_next/static/chunks/app/_not-found/page-a765daab592ef93c.js",
  "/_next/static/chunks/app/cbt/page-09a5e88972a9e097.js",
  "/_next/static/chunks/app/chapters/page-9bc2788c1c32c6d1.js",
  "/_next/static/chunks/app/drills/page-3f1fe1bfae45c904.js",
  "/_next/static/chunks/app/layout-6d60ded7cd844af8.js",
  "/_next/static/chunks/app/page-f934b067df520602.js",
  "/_next/static/chunks/app/stats/page-8c1225fceffe18df.js",
  "/_next/static/chunks/app/study/page-a8eb2e44bdb3e1c8.js",
  "/_next/static/chunks/framework-a42b9d7201e39ba8.js",
  "/_next/static/chunks/main-app-2195b67eb90757b5.js",
  "/_next/static/chunks/main-e6b2609f6a1b95fe.js",
  "/_next/static/chunks/pages/_app-3aeb40632ab341f7.js",
  "/_next/static/chunks/pages/_error-cff60accbac7413f.js",
  "/_next/static/chunks/polyfills-42372ed130431b0a.js",
  "/_next/static/chunks/webpack-8c800a3e9e5ef51c.js",
  "/_next/static/css/24e485cee01c34f6.css",
  "/_next/static/media/inter-latin-400-normal.2c7a775c.woff",
  "/_next/static/media/inter-latin-400-normal.ef6d3f52.woff2",
  "/_next/static/media/inter-latin-500-normal.b7b43ace.woff2",
  "/_next/static/media/inter-latin-500-normal.cb4c8ceb.woff",
  "/_next/static/media/inter-latin-600-normal.8fb1a964.woff2",
  "/_next/static/media/inter-latin-600-normal.ce0f5f43.woff",
  "/_next/static/media/inter-latin-700-normal.953b7aa5.woff2",
  "/_next/static/media/inter-latin-700-normal.9c21d4dc.woff",
  "/_next/static/media/noto-sans-jp-japanese-400-normal.425d78d7.woff",
  "/_next/static/media/noto-sans-jp-japanese-400-normal.a21ec679.woff2",
  "/_next/static/media/noto-sans-jp-japanese-700-normal.c6f7f31c.woff",
  "/_next/static/media/noto-sans-jp-japanese-700-normal.f1117f13.woff2",
  "/_next/static/nP8I6hpu6UCrKq1xR5mNZ/_buildManifest.js",
  "/_next/static/nP8I6hpu6UCrKq1xR5mNZ/_ssgManifest.js",
  "/cbt",
  "/cbt.html",
  "/cbt.txt",
  "/chapters",
  "/chapters.html",
  "/chapters.txt",
  "/drills",
  "/drills.html",
  "/drills.txt",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/index.html",
  "/index.txt",
  "/manifest.json",
  "/stats",
  "/stats.html",
  "/stats.txt",
  "/study",
  "/study.html",
  "/study.txt"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') {
          return caches.match(url.pathname) || caches.match('/');
        }
        return Response.error();
      });
    })
  );
});
