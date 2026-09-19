/* Seed — service worker. Bump CACHE when the app shell changes. */
const CACHE='seed-v2';
const RUNTIME='seed-runtime-v2';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE && k!==RUNTIME).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;

  // App page: network-first so updates show when online, cached fallback offline.
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(r=>{
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put('./index.html',copy));
        return r;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // Everything else (icons, three.js CDN, fonts): cache-first, then network + cache.
  e.respondWith(
    caches.match(req).then(hit=>{
      if(hit) return hit;
      return fetch(req).then(r=>{
        if(r && (r.ok || r.type==='opaque')){
          const copy=r.clone();
          caches.open(RUNTIME).then(c=>c.put(req,copy));
        }
        return r;
      }).catch(()=>hit);
    })
  );
});
