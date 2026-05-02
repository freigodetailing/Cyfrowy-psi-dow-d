const CACHE_NAME = 'psie-breloki-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './login.html',
    './forum.html',
    './style.css',
    './script.js',
    './login.js',
    './forum.js',
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
