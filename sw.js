const CACHE_NAME = 'polar-elite-v5';

// 1. INSTALACIÓN: El soldado entra y toma el control al instante
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Reclama todos los procesos abiertos sin esperar
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// 3. MODO OFFLINE: Si se corta el internet, intenta abrir la caché primero. 
// Si de verdad no hay nada, suelta tu mensaje.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
        return caches.match(e.request).then((response) => {
            return response || new Response("Estás sin conexión, líder.");
        });
    })
  );
});

// 4. EL TOQUE MAESTRO (LO NUEVO): Qué pasa cuando haces tap en la alerta
self.addEventListener('notificationclick', (event) => {
    // Primero, cerramos la notificación en el centro de control del teléfono
    event.notification.close();
    
    // Buscamos si la App Polar ya está abierta en alguna parte
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                // Si la app está en segundo plano, la trae al frente y la enfoca
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si estaba completamente cerrada, la abre desde cero
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
