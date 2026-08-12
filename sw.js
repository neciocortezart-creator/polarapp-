const CACHE_NAME = 'polar-elite-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './polar-logo.png',
  // Librerías externas vitales
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  // Fuentes (Tipografía Élite)
  'https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&display=swap'
];

// Instalar el Service Worker y guardar los archivos esenciales
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Líder: Cache Élite activada.');
      // Agregamos un catch por si algún CDN demora, no detenga la instalación del resto
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.error("Fallo menor al cachear:", err));
    })
  );
});

// Limpiar caches viejas al activar (Excelencia y limpieza)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Limpiando caché antigua:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar las peticiones para el modo Offline Absoluto
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. IGNORAR API DE SUPABASE: Dejamos que la red decida. 
  // Si falla, la cola offline de tu index.html hace el trabajo pesado.
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. STALE-WHILE-REVALIDATE para todo lo demás (Archivos, CDNs, Fuentes)
  // Mostramos lo que hay en caché al instante (CERO LAG), y por debajo actualizamos.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        
        // CORRECCIÓN ÉLITE: Se eliminó la restricción de 'basic' para permitir
        // guardar los CDNs (CORS) y tipografías en la bóveda del teléfono.
        // Aceptamos status 0 para peticiones opacas de CDNs.
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.log('Modo Offline: Operando desde la bóveda de forma segura.');
      });

      return cachedResponse || fetchPromise;
    })
  );
});
