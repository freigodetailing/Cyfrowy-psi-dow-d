const CACHE_NAME = 'psie-breloki-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './panel.html',
    './panel.js',
    './tracking.html',
    './tracking.js',
    './walk.html',
    './walk.js',
    './style.css',
    './script.js',
    './login.js',
    './photos/podstawa.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache v3');
                return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('PWA Cache error:', err));
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('supabase.co')) return;
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'stop-walk') {
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'STOP_WALK' });
            });
        });
    } else {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                if (clients.length > 0) clients[0].focus();
                else self.clients.openWindow('./panel.html');
            })
        );
    }
});

self.addEventListener('message', event => {
    if (event.data.type === 'SHOW_WALK_NOTIFICATION') {
        const { steps, duration, petName } = event.data;
        self.registration.showNotification(`Aktywny spacer: ${petName}`, {
            body: `${duration} | ${steps} kroków`,
            icon: './photos/podstawa.png',
            badge: './photos/podstawa.png',
            tag: 'walk-status',
            renotify: false,
            silent: true,
            sticky: true,
            actions: [{ action: 'stop-walk', title: 'Zatrzymaj spacer', icon: '' }]
        });
    }
    if (event.data.type === 'CLEAR_WALK_NOTIFICATION') {
        self.registration.getNotifications({ tag: 'walk-status' }).then(notifications => {
            notifications.forEach(n => n.close());
        });
    }
    if (event.data.type === 'SCHEDULE_REMINDER') {
        const { message } = event.data;
        setTimeout(() => {
            self.registration.showNotification("Pamiętasz o spacerze?", {
                body: message,
                icon: './photos/podstawa.png',
                badge: './photos/podstawa.png',
                tag: 'motivation-reminder'
            });
        }, 1000 * 60 * 15);
    }
});
