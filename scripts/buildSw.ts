import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'out');
const PUBLIC_SW = path.join(process.cwd(), 'public', 'sw.js');

function collectFiles(dir: string, base: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, base, acc);
    } else {
      const rel = '/' + path.relative(base, full).replace(/\\/g, '/');
      if (rel === '/sw.js' || rel.endsWith('.map')) continue;
      acc.push(rel);
      if (rel === '/index.html') acc.push('/');
      else if (rel.endsWith('.html')) acc.push(rel.slice(0, -'.html'.length));
    }
  }
  return acc;
}

function buildServiceWorkerSource(urls: string[]): string {
  const uniqueUrls = Array.from(new Set(urls)).sort();
  return `/* Generated offline-first precache Service Worker */
const CACHE_NAME = 'ssw-shukuhaku-v1';
const PRECACHE_URLS = ${JSON.stringify(uniqueUrls, null, 2)};

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
`;
}

if (fs.existsSync(OUT_DIR)) {
  const urls = collectFiles(OUT_DIR, OUT_DIR);
  const code = buildServiceWorkerSource(urls);
  fs.writeFileSync(path.join(OUT_DIR, 'sw.js'), code, 'utf-8');
  fs.writeFileSync(PUBLIC_SW, code, 'utf-8');
  console.log(`buildSw: precached ${urls.length} static routes and assets into out/sw.js`);
} else {
  const fallbackCode = buildServiceWorkerSource([
    '/',
    '/chapters',
    '/study',
    '/drills',
    '/cbt',
    '/stats',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
  ]);
  fs.mkdirSync(path.dirname(PUBLIC_SW), { recursive: true });
  fs.writeFileSync(PUBLIC_SW, fallbackCode, 'utf-8');
  console.log('buildSw: wrote fallback public/sw.js');
}
