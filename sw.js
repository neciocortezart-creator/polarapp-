const CACHE_NAME = 'polar-elite-v5';

// El Service Worker se instala
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// El Service Worker se activa
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Intercepta las peticiones de red (necesario para que sea instalable)
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response("Estás sin conexión, líder.")));
});