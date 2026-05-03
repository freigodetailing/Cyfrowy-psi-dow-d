// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pJ30AqPhX_majQPU94l2qQ_6uBAQE64';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let map;
let petMarker; // Zmieniamy nazwę dla jasności (to jest ten kolorowy)
let historyMarkers = []; // Tablica na szare punkty z dziś
let userMarker;
let petId;

function getFinalImageUrl(url) {
    if (!url || url === "Brak danych" || url === "" || url === "./dog_sample.png" || url === "./1.png") return "./photos/podstawa.png";
    if (!url.startsWith('http') && !url.startsWith('./photos/')) {
        return `./photos/${url.replace('./', '')}`;
    }
    return url;
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    petId = urlParams.get('id');

    if (!petId) {
        window.location.href = 'panel.html';
        return;
    }

    // Inicjalizacja mapy
    map = L.map('map', {
        zoomControl: false,
        tap: true // Lepsza obsługa dotyku na mobile
    }).setView([52.0, 19.0], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    await loadPetData();
    await loadTodayHistory(); // Ładowanie historii z dziś
    setupRealtimeSubscription();
    setupUserLocation();
    
    document.getElementById('navCarBtn').addEventListener('click', () => startNavigation('car'));
    document.getElementById('navFootBtn').addEventListener('click', () => startNavigation('foot'));
    
    document.getElementById('loader').classList.add('hidden');
});

let routingControl = null;
let isNavigating = false;
let isFollowing = false;
let currentProfile = 'foot';
let pendingProfile = null; // Przechowuje tryb, jeśli czekamy na GPS

function startNavigation(profile) {
    if (isNavigating && currentProfile === profile) {
        // Jeśli kliknięto ten sam tryb drugi raz - wyłączamy
        stopNavigation();
        return;
    }
    
    if (isNavigating) {
        stopNavigation();
    }

    if (!petMarker || !userMarker) {
        const gpsModal = document.getElementById('gpsModal');
        const confirmGpsBtn = document.getElementById('confirmGpsBtn');
        const cancelGpsBtn = document.getElementById('cancelGpsBtn');

        if (gpsModal) {
            gpsModal.classList.remove('hidden');
            
            cancelGpsBtn.onclick = () => gpsModal.classList.add('hidden');
            
            confirmGpsBtn.onclick = () => {
                gpsModal.classList.add('hidden');
                pendingProfile = profile; // Zapamiętujemy co chcieliśmy włączyć
                
                // Próbujemy wymusić odświeżenie lokalizacji
                navigator.geolocation.getCurrentPosition((pos) => {
                    // Sukces - watchPosition i tak za chwilę wywoła startNavigation przez pendingProfile
                }, (err) => {
                    console.error("GPS Error:", err);
                    pendingProfile = null;
                }, { enableHighAccuracy: true });
            };
        }
        return;
    }

    currentProfile = profile;
    isNavigating = true;
    isFollowing = true; // Śledzenie włączone dla obu trybów

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userMarker.getLatLng()),
            L.latLng(petMarker.getLatLng())
        ],
        routeWhileDragging: false,
        show: false,
        addWaypoints: false,
        router: L.Routing.osrmv1({
            serviceUrl: profile === 'car' 
                ? 'https://routing.openstreetmap.de/routed-car/route/v1' 
                : 'https://routing.openstreetmap.de/routed-foot/route/v1',
            profile: profile === 'car' ? 'driving' : 'foot'
        }),
        lineOptions: {
            styles: [{ color: profile === 'car' ? '#1890ff' : '#ff7e67', weight: 6, opacity: 0.8 }]
        }
    }).addTo(map);

    updateNavButtons();
    
    // Zawsze zbliżenie dla trybu prowadzenia
    map.setView(userMarker.getLatLng(), profile === 'car' ? 16 : 18);
}

function stopNavigation() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    isNavigating = false;
    isFollowing = false;
    updateNavButtons();
    fitMapBounds();
}

function updateNavButtons() {
    const carBtn = document.getElementById('navCarBtn');
    const footBtn = document.getElementById('navFootBtn');

    carBtn.className = (isNavigating && currentProfile === 'car') ? 'btn-action flex-1' : 'btn-outline flex-1';
    footBtn.className = (isNavigating && currentProfile === 'foot') ? 'btn-action flex-1' : 'btn-outline flex-1';
    
    if (isNavigating) {
        if (currentProfile === 'car') carBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Stop (Auto)';
        else footBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Stop (Pieszo)';
    } else {
        carBtn.innerHTML = '<i class="fa-solid fa-car"></i> Samochodem';
        footBtn.innerHTML = '<i class="fa-solid fa-person-walking"></i> Pieszo';
    }
}

async function loadPetData() {
    // 1. Sprawdź czy użytkownik jest zalogowany
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        console.error("Brak sesji użytkownika");
        window.location.href = 'panel.html';
        return;
    }

    // 2. Pobierz dane psa
    const { data, error } = await supabaseClient
        .from('dogs')
        .select('*')
        .eq('ID', petId)
        .single();

    // 3. Sprawdź czy użytkownik ma przypisanego tego psa (tabela pet_claims)
    const { data: claim, error: claimError } = await supabaseClient
        .from('pet_claims')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('pet_id', petId)
        .maybeSingle();

    if (claimError || !claim) {
        alert("Nie masz uprawnień do śledzenia tego pupila.");
        window.location.href = 'panel.html';
        return;
    }

    document.getElementById('petName').textContent = data['IMIE PSA'];
    document.getElementById('petAvatar').src = getFinalImageUrl(data['ZDJECIE']);
}

async function loadTodayHistory() {
    // Obliczamy początek dzisiejszego dnia (00:00:00 czasu lokalnego)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data: scans, error } = await supabaseClient
        .from('Nawigacja')
        .select('*')
        .eq('pet_id', petId)
        .gte('created_at', startOfToday.toISOString())
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error history:", error);
        return;
    }

    renderScans(scans);
}

function renderScans(scans) {
    // Czyścimy stare markery
    if (petMarker) map.removeLayer(petMarker);
    historyMarkers.forEach(m => map.removeLayer(m));
    historyMarkers = [];

    if (!scans || scans.length === 0) {
        document.getElementById('lastSeenTime').textContent = "Brak skanowań w dniu dzisiejszym";
        document.getElementById('coordinates').textContent = "Brak danych";
        return;
    }

    scans.forEach((scan, index) => {
        const isLatest = (index === scans.length - 1);
        const coords = [scan.lat, scan.lng];

        if (isLatest) {
            // Kolorowy marker dla najnowszego punktu
            const petIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='marker-pin'><i class='fa-solid fa-paw'></i></div><div class='pulse-ring'></div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            });
            petMarker = L.marker(coords, { icon: petIcon }).addTo(map);
            
            // Aktualizacja info boxa
            document.getElementById('coordinates').textContent = `${scan.lat.toFixed(5)}, ${scan.lng.toFixed(5)}`;
            document.getElementById('externalMapsBtn').href = `https://www.google.com/maps?q=${scan.lat},${scan.lng}`;
            const date = new Date(scan.created_at);
            document.getElementById('lastSeenTime').textContent = date.toLocaleString('pl-PL', {
                hour: '2-digit', minute: '2-digit'
            }) + " (Dzisiaj)";
        } else {
            // Szary marker dla historii
            const grayIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='marker-pin marker-pin-gray'><i class='fa-solid fa-paw'></i></div>`,
                iconSize: [24, 34],
                iconAnchor: [12, 34]
            });
            const m = L.marker(coords, { icon: grayIcon }).addTo(map);
            m.bindPopup(`Widziany o: ${new Date(scan.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`);
            historyMarkers.push(m);
        }
    });

    fitMapBounds();
}

function setupUserLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition((position) => {
            const uLat = position.coords.latitude;
            const uLng = position.coords.longitude;
            const uCoords = [uLat, uLng];

            if (!userMarker) {
                const userIcon = L.divIcon({
                    className: 'user-div-icon',
                    html: `<div class='user-marker-wrapper'><div class='user-marker-arrow'></div></div>`,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                userMarker = L.marker(uCoords, { icon: userIcon }).addTo(map);
                
                if (!petMarker) {
                    map.setView(uCoords, 14);
                }
                
                // Inicjalizacja kompasu po pierwszym złapaniu pozycji
                initCompass();

                // AUTOMATYCZNE URUCHOMIENIE NAWIGACJI
                if (pendingProfile) {
                    const profileToStart = pendingProfile;
                    pendingProfile = null; // Czyścimy, żeby nie zapętlić
                    startNavigation(profileToStart);
                }
            } else {
                userMarker.setLatLng(uCoords);
            }

            // Aktualizacja trasy w czasie rzeczywistym podczas ruchu
            if (isNavigating && routingControl && petMarker) {
                routingControl.setWaypoints([
                    L.latLng(uCoords),
                    L.latLng(petMarker.getLatLng())
                ]);

                // Jeśli jesteśmy w trybie śledzenia (nawigacja piesza), centrujemy mapę na użytkowniku
                if (isFollowing) {
                    map.panTo(uCoords);
                }
            }

            if (!isNavigating) fitMapBounds();
        }, (err) => {
            console.warn("User location error:", err);
        }, { enableHighAccuracy: true });
    }
}

function initCompass() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }
}

function handleOrientation(event) {
    let heading = event.alpha;
    if (event.webkitCompassHeading) {
        heading = event.webkitCompassHeading; // iOS
    }
    
    if (heading !== null && userMarker) {
        const arrow = document.querySelector('.user-marker-arrow');
        if (arrow) {
            arrow.style.transform = `rotate(${heading}deg)`;
        }
    }
}

function fitMapBounds() {
    if (isNavigating) return;
    const allMarkers = [];
    if (petMarker) allMarkers.push(petMarker);
    if (userMarker) allMarkers.push(userMarker);
    historyMarkers.forEach(m => allMarkers.push(m));

    if (allMarkers.length > 1) {
        const group = new L.featureGroup(allMarkers);
        map.fitBounds(group.getBounds().pad(0.2));
    } else if (allMarkers.length === 1) {
        map.setView(allMarkers[0].getLatLng(), 15);
    }
}

function setupRealtimeSubscription() {
    // Subskrypcja na NOWE skanowania w tabeli Nawigacja
    const channel = supabaseClient
        .channel(`scans-${petId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'Nawigacja', 
            filter: `pet_id=eq.${petId}` 
        }, payload => {
            console.log('New scan received:', payload.new);
            // Ponieważ dostajemy tylko nowy rekord, najlepiej przeładować historię z dziś,
            // aby zachować poprawną kolejność i kolory markerów.
            loadTodayHistory();
        })
        .subscribe();
}
