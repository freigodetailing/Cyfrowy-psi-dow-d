const CACHE_NAME = 'psie-breloki-v9';
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
    './photos/podstawa.png',
    './photos/paw.png'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache v5');
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

// --- Obsługa prawdziwych Web Push (działa gdy aplikacja jest ZAMKNIĘTA) ---
self.addEventListener('push', event => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'Psie Breloki 🐾',
            body: event.data.text(),
            icon: './photos/podstawa.png',
            badge: './photos/paw.png',
            url: './panel.html'
        };
    }

    const options = {
        body: data.body ?? 'Masz nową wiadomość!',
        icon: data.icon ?? './photos/podstawa.png',
        badge: data.badge ?? './photos/paw.png',
        tag: data.tag ?? 'psie-breloki-push',
        data: { url: data.url ?? './panel.html' },
        vibrate: [200, 100, 200, 100, 200],
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title ?? 'Psie Breloki 🐾', options)
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
        const targetUrl = (event.notification.data && event.notification.data.url) 
            ? event.notification.data.url 
            : './panel.html';
            
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                // Szukamy otwartego okna pasującego do panel.html lub tracking.html
                for (const client of clients) {
                    if (client.url.includes('panel.html') || client.url.includes('tracking.html')) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                return self.clients.openWindow(targetUrl);
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
            badge: './photos/paw.png',
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
                badge: './photos/paw.png',
                tag: 'motivation-reminder'
            });
        }, 1000 * 60 * 15);
    }
});
