const CACHE_NAME = 'psie-breloki-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './panel.html',
    './panel.js',
    './tracking.html',
    './tracking.js',
    './style.css',
    './script.js',
    './login.js',
    './photos/podstawa.png'
];

// Instalacja Service Workera i cachowanie podstawowych plików
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // catch-error handling by not returning raw addAll if files are missing
                return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('PWA Cache error:', err));
            })
    );
});

// Strategia Network-First (Offline Fallback)
self.addEventListener('fetch', event => {
    // Nie cachujemy wywołań API Supabase, tylko same pliki aplikacji
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Jeśli pobraliśmy z sieci, zapisujemy to w cache na później
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            })
            .catch(() => {
                // Jeśli nie ma sieci, zwracamy plik z cache
                return caches.match(event.request);
            })
    );
});
// Obsługa powiadomień i akcji (Spacer w tle)
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'stop-walk') {
        // Powiadom aplikację, że chcemy zatrzymać spacer
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({ type: 'STOP_WALK' });
            });
        });
    } else {
        // Kliknięcie w samo powiadomienie - otwórz aplikację
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then(clients => {
                if (clients.length > 0) {
                    clients[0].focus();
                } else {
                    self.clients.openWindow('./panel.html');
                }
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
            tag: 'walk-status', // Nadpisujemy to samo powiadomienie
            renotify: false,    // Nie wibruj przy każdej aktualizacji
            silent: true,       // Cicha aktualizacja
            sticky: true,       // Trudniejsze do usunięcia
            actions: [
                { action: 'stop-walk', title: 'Zatrzymaj spacer', icon: '' }
            ]
        });
    }
    
    if (event.data.type === 'CLEAR_WALK_NOTIFICATION') {
        self.registration.getNotifications({ tag: 'walk-status' }).then(notifications => {
            notifications.forEach(n => n.close());
        });
    }

    if (event.data.type === 'SCHEDULE_REMINDER') {
        const { message } = event.data;
        // Uwaga: SW może zostać zabity przez przeglądarkę, więc setTimeout nie jest 100% pewny na długie dystanse.
        // Ale na krótsze przypomnienia zadziała.
        setTimeout(() => {
            self.registration.showNotification("Pamiętasz o spacerze?", {
                body: message,
                icon: './photos/podstawa.png',
                badge: './photos/podstawa.png',
                tag: 'motivation-reminder'
            });
        }, 1000 * 60 * 15); // Przykład: 15 minut po wyjściu
    }
});
