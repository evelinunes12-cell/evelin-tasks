// Zenit Custom Service Worker — Push Notifications + Fast Updates

// Take control of all clients as soon as a new SW activates so users
// always get the latest version after a deploy without manual refresh.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches that don't belong to the current Workbox precache
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => !key.includes('workbox-precache'))
            .map((key) => caches.delete(key))
        );
      } catch (_) {
        /* ignore */
      }
      await self.clients.claim();
    })()
  );
});

// Allow the page to trigger immediate activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let data = { title: 'Zenit', body: 'Nova notificação', url: '/' };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.message || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: data.url || data.link || '/' },
    vibrate: [100, 50, 100],
    tag: data.tag || 'zenit-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
