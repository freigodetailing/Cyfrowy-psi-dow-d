// PWA Installation Logic
let deferredPrompt = null;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafariOnIOS = isIOS &&
    /Safari/i.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent) &&
    !/wv|WebView/i.test(navigator.userAgent);

// Sprawdza czy aplikacja działa w trybie standalone (zainstalowana PWA)
function checkIsStandalone() {
    const displayModeStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches;

    const iosStandalone = window.navigator.standalone === true;
    const urlParam = window.location.search.includes('mode=pwa') ||
                     window.location.search.includes('utm_source=pwa');
    const androidApp = document.referrer.includes('android-app://');
    const sessionFlag = sessionStorage.getItem('isPWAStandalone') === 'true';

    const isStandalone = displayModeStandalone || iosStandalone || urlParam || androidApp || sessionFlag;

    if (isStandalone) {
        sessionStorage.setItem('isPWAStandalone', 'true');
        localStorage.setItem('pwaInstalled', '1');
    }
    return isStandalone;
}

// Natychmiastowe ukrycie przycisku jeśli już zainstalowana (bez czekania na DOM)
if (checkIsStandalone() || localStorage.getItem('pwaInstalled') === '1') {
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('installAppBtn');
        if (btn) btn.style.display = 'none';
    });
}

// beforeinstallprompt: przeglądarka sygnalizuje że można zainstalować
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();

    // Jeśli standalone lub już zainstalowana — ignoruj całkowicie
    if (checkIsStandalone() || localStorage.getItem('pwaInstalled') === '1') {
        deferredPrompt = null;
        const btn = document.getElementById('installAppBtn');
        if (btn) btn.style.display = 'none';
        return;
    }

    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'flex';
});

// appinstalled: użytkownik właśnie zainstalował aplikację
window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwaInstalled', '1');
    sessionStorage.setItem('isPWAStandalone', 'true');
    deferredPrompt = null;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'none';
});

// Po załadowaniu DOM — ostateczna weryfikacja
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installAppBtn');
    if (!installBtn) return;

    if (checkIsStandalone() || localStorage.getItem('pwaInstalled') === '1') {
        installBtn.style.display = 'none';
        return;
    }

    // iOS Safari bez instalacji — pokaż przycisk
    if (isSafariOnIOS) {
        installBtn.style.display = 'flex';
    }
});

// Instalacja PWA na kliknięcie przycisku
async function installPWA() {
    const installBtn = document.getElementById('installAppBtn');

    if (!deferredPrompt) {
        if (isIOS) {
            if (confirm('Aby zainstalować aplikację na iPhone:\n1. Kliknij ikonę udostępniania (kwadrat ze strzałką)\n2. Wybierz "Do ekranu początkowego"\n\nCzy trwale ukryć ten przycisk na tym urządzeniu?')) {
                localStorage.setItem('pwaInstalled', '1');
                if (installBtn) installBtn.style.display = 'none';
            }
        } else {
            if (confirm('Aplikacja jest już zainstalowana lub Twoja przeglądarka nie wspiera automatycznej instalacji.\n\nCzy trwale ukryć ten przycisk na tym urządzeniu?')) {
                localStorage.setItem('pwaInstalled', '1');
                if (installBtn) installBtn.style.display = 'none';
            }
        }
        return;
    }

    try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            localStorage.setItem('pwaInstalled', '1');
            if (installBtn) installBtn.style.display = 'none';
        }
    } catch (err) {
        console.warn('[PWA] Install prompt error:', err);
    }
    deferredPrompt = null;
}



// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatDateLocal(date) {
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// -----------------------------
// Pomocnicza funkcja kalkulująca wiek z daty urodzenia
function calculateAge(ageInput) {
    if (!ageInput || ageInput === "Brak danych") return ageInput;
    
    // Obsługa ewentualnego formatu daty z arkusza, jeśli przyjdzie jako string ISO "2022-05-12T..."
    let birthDate = new Date(ageInput);
    
    // Jeśli nie jest to poprawny standardowy format Daty, spróbujmy ręcznie wyciągnąć np. 12.05.2020
    if (isNaN(birthDate.getTime())) {
        const dateRegex = /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/;
        if (dateRegex.test(ageInput.trim())) {
            let parts = ageInput.trim().match(dateRegex);
            if (parts[1].length === 4) {
                birthDate = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
            } else {
                birthDate = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]));
            }
        }
    }
    
    // Jeśli wciąż to nie jest data (czyli ktoś wpisał tekst np. "3 lata"), po prostu zwracamy ten tekst
    if (isNaN(birthDate.getTime())) {
        return ageInput;
    }
    
    // Obliczamy wiek z poprawnej daty
    let now = new Date();
    let ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    if (now.getDate() < birthDate.getDate()) {
        ageInMonths--;
    }
    
    if (ageInMonths < 0) return "Jeszcze się nie urodził!";
    if (ageInMonths === 0) return "Mniej niż miesiąc";
    
    let years = Math.floor(ageInMonths / 12);
    let months = ageInMonths % 12;
    
    let result = "";
    if (years > 0) {
        if (years === 1) result += "1 rok";
        else if (years % 10 >= 2 && years % 10 <= 4 && (years < 10 || years > 20)) result += years + " lata";
        else result += years + " lat";
    }
    
    if (months > 0) {
        if (result.length > 0) result += " i ";
        if (months === 1) result += "1 miesiąc";
        else if (months >= 2 && months <= 4) result += months + " miesiące";
        else result += months + " miesięcy";
    }
    
    return result;
}

const DEFAULT_PROFILE = {
    dogName: "Bezimienny",
    dogAge: "Brak danych",
    dogPhotoUrl: "logo.png",
    dogHealth: "Brak danych. W razie znalezienia psa, natychmiast skontaktuj się z właścicielem lub weterynarzem.",
    ownerName: "Brak danych",
    ownerPhone: "Brak danych",
    dogGender: "Brak danych",
    dogBreed: "Brak danych",
    isLost: false
};

async function fetchDogData(tagId) {
    try {
        // Rozwiązanie secure_id lub tradycyjnego ID
        let query = supabaseClient.from('dogs').select('*');
        if (/^\d+$/.test(tagId) && parseInt(tagId) <= 25) {
            query = query.eq('ID', parseInt(tagId));
        } else {
            query = query.eq('secure_id', tagId);
        }
        const { data, error } = await query.single();

        if (error) {
            console.error("Supabase Error: ", error.message);
            return DEFAULT_PROFILE;
        }
        
        if (data) {
              return {
                  id: data['ID'],
                  secure_id: data['secure_id'] || data['ID']?.toString(),
                  dogName: (data['IMIE PSA'] && data['IMIE PSA'] !== 'null') ? data['IMIE PSA'] : 'Bezimienny',
                  dogAge: data['WIEK PSA'],
                  dogGender: data['PLEC'] || 'Brak danych',
                dogBreed: data['RASA'] || 'Brak danych',
                ownerName: data['IMIE PANA/I'],
                ownerPhone: data['NR TELEFONU'],
                dogHealth: data['INFO'],
                dogPhotoUrl: data['ZDJECIE'],
                likes: data['LAJKI'],
                isLost: data['ZGUBA'] || false,
                isOrphan: data['SIEROTA'] === true,
                user_id: data.user_id
            };
        } else {
            return DEFAULT_PROFILE;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        return DEFAULT_PROFILE;
    }
}

// Inicjalizacja
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Pobranie ID z URL. Przykładowy URL: index.html?id=12345
    const urlParams = new URLSearchParams(window.location.search);
    let tagId = urlParams.get('id');
    
    // Jeśli nie podano ID psa (np. wejście z ekranu głównego)
    if (!tagId) {
        window.location.replace('panel.html');
        return; // Zakończ działanie skryptu profilu
    }

    // 2. Pobranie danych
    try {
        const profileData = await fetchDogData(tagId);

        // 3. Wypełnienie DOM
        document.getElementById('dogName').textContent = profileData.dogName;

        // --- Obsługa nieprzypisanego breloka (Sieroty) ---
        const orphanAssignSection = document.getElementById('orphanAssignSection');
        const assignOrphanBtn = document.getElementById('assignOrphanBtn');
        
        if (profileData.isOrphan) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                // Jeśli użytkownik jest zalogowany i skanuje sierotę, automatycznie przypisujemy
                // To omija błąd Androida ładującego profil zamiast uruchamiania Web NFC
                window.location.href = `panel.html?action=assign_auto&id=${tagId}`;
                return;
            }
            
            if (orphanAssignSection) orphanAssignSection.classList.remove('hidden');
            if (assignOrphanBtn) {
                assignOrphanBtn.onclick = () => {
                    window.location.href = `panel.html?action=assign_auto&id=${tagId}`;
                };
            }
            document.getElementById('profileContent').classList.add('hidden');
            return; // Zatrzymujemy ładowanie dalszych danych, bo brelok jest pusty
        }
    
    // Automatyczne kalkulowanie wieku, jeśli została podana data (lub tekst bezpośrednio z API)
    document.getElementById('dogAge').textContent = calculateAge(profileData.dogAge);
    
    // Obsługa braku zdjęcia (szary placeholder)
    let finalImageUrl = profileData.dogPhotoUrl;
    if (!finalImageUrl || finalImageUrl === "null" || finalImageUrl === "./dog_sample.png" || finalImageUrl === "Brak danych" || finalImageUrl === "" || finalImageUrl === "./1.png" || finalImageUrl === "./photos/podstawa.png") {
        finalImageUrl = "logo.png";
    } else if (!finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('./photos/')) {
        // Jeśli w arkuszu jest sama nazwa pliku (np. "1.jpg") albo "./1.jpg"
        finalImageUrl = finalImageUrl.replace('./', '');
        finalImageUrl = `./photos/${finalImageUrl}`;
    }
    document.getElementById('dogImage').src = finalImageUrl;

    // --- Lightbox: powiększenie zdjęcia pupila ---
    const dogImageRing = document.getElementById('dogImageRing');
    const photoLightbox = document.getElementById('photoLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    const lightboxBackdrop = document.getElementById('lightboxBackdrop');

    if (dogImageRing && photoLightbox && lightboxImage) {
        const openLightbox = () => {
            lightboxImage.src = finalImageUrl;
            photoLightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeLightbox = () => {
            photoLightbox.classList.remove('active');
            document.body.style.overflow = '';
        };

        dogImageRing.addEventListener('click', openLightbox);
        if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
        if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && photoLightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    document.getElementById('dogHealth').textContent = profileData.dogHealth;
    document.getElementById('ownerName').textContent = profileData.ownerName;

    // Sekcja rasy - pokazuj tylko jeśli podana
    const breedSection = document.getElementById('breedSection');
    const dogBreedEl = document.getElementById('dogBreed');
    if (breedSection && dogBreedEl) {
        const breed = profileData.dogBreed;
        if (breed && breed !== 'Brak danych' && breed.trim() !== '') {
            dogBreedEl.textContent = breed;
            breedSection.classList.remove('hidden');
        } else {
            breedSection.classList.add('hidden');
        }
    }

    // Obsługa plakietki płci
    const genderBadge = document.getElementById('genderBadge');
    const genderIcon = document.getElementById('genderIcon');
    if (genderBadge && genderIcon) {
        if (profileData.dogGender === 'Samiec') {
            genderBadge.classList.remove('hidden', 'female');
            genderBadge.classList.add('male');
            genderIcon.className = 'fa-solid fa-mars';
        } else if (profileData.dogGender === 'Samica') {
            genderBadge.classList.remove('hidden', 'male');
            genderBadge.classList.add('female');
            genderIcon.className = 'fa-solid fa-venus';
        } else {
            genderBadge.classList.add('hidden');
        }
    }
    
    // Obsługa przycisku lokalizacji/mapy
    const mapBtn = document.getElementById('mapBtn');
    if (mapBtn) {
        // Domyślna akcja dla znalazcy: wysłanie lokalizacji
        mapBtn.onclick = () => {
            if (!("geolocation" in navigator)) {
                alert("Twoje urządzenie nie obsługuje geolokalizacji.");
                return;
            }
            
            const originalContent = mapBtn.innerHTML;
            mapBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Wysyłam...</span>';
            
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                try {
                    await supabaseClient.from('dogs').update({ 
                        'LAST_LAT': lat, 
                        'LAST_LNG': lng, 
                        'LAST_SCAN_TIME': new Date().toISOString() 
                    }).eq('ID', profileData.id);
                    
                    await supabaseClient.from('Nawigacja').insert({
                        'pet_id': profileData.id,
                        'lat': lat,
                        'lng': lng
                    });
                    
                    mapBtn.innerHTML = '<i class="fa-solid fa-check"></i><span>Wysłano</span>';
                    setTimeout(() => { mapBtn.innerHTML = originalContent; }, 3000);
                    
                    const thankYouModalOverlay = document.getElementById('thankYouModalOverlay');
                    if (thankYouModalOverlay) {
                        thankYouModalOverlay.classList.add('active');
                    }
                } catch (e) {
                    console.error("Błąd podczas zapisywania lokalizacji:", e);
                    mapBtn.innerHTML = originalContent;
                    alert("Wystąpił błąd podczas wysyłania lokalizacji.");
                }
            }, (err) => {
                console.warn("Błąd geolokalizacji:", err);
                mapBtn.innerHTML = originalContent;
                alert("Proszę zezwolić na dostęp do lokalizacji, aby wysłać sygnał.");
            }, { enableHighAccuracy: true, timeout: 10000 });
        };
        // Sprawdzamy czy użytkownik jest właścicielem - nadpisze powyższą akcję
        checkOwnershipForMap(profileData);
    }

    // Obsługa Trybu Zaginiony (Lost Mode 2.0)
    const standardProfileInfo = document.getElementById('standardProfileInfo');
    const lostEmergencyInfo = document.getElementById('lostEmergencyInfo');
    const imageOuterRing = document.querySelector('.image-outer-ring');
    const themeColorCircles = document.querySelectorAll('.color-circle');

    if (profileData.isLost) {
        document.documentElement.setAttribute('data-theme', 'lost');
        if(standardProfileInfo) standardProfileInfo.classList.add('hidden');
        if(lostEmergencyInfo) lostEmergencyInfo.classList.remove('hidden');
        if(imageOuterRing) imageOuterRing.classList.add('lost-pulse-ring');
        
        // Zabezpieczenie: zablokowanie zmiany motywu w ustawieniach
        themeColorCircles.forEach(circle => {
            circle.style.pointerEvents = 'none';
            circle.style.opacity = '0.5';
        });
    } else {
        // Wczytanie zapisanego motywu (motyw z localStorage jest aplikowany w innej części pliku,
        // ale na wszelki wypadek usuwamy nadpisanie)
        const savedTheme = localStorage.getItem('appTheme') || 'orange';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        if(standardProfileInfo) standardProfileInfo.classList.remove('hidden');
        if(lostEmergencyInfo) lostEmergencyInfo.classList.add('hidden');
        if(imageOuterRing) imageOuterRing.classList.remove('lost-pulse-ring');
        
        // Odblokowanie zmiany motywu
        themeColorCircles.forEach(circle => {
            circle.style.pointerEvents = 'auto';
            circle.style.opacity = '1';
        });
    }

    // --- Automatyczne raportowanie lokalizacji dla zgubionych pupili ---
    if (profileData.isLost && "geolocation" in navigator) {
        // Sprawdzamy czy użytkownik jest właścicielem - jeśli tak, nie pytamy go o lokalizację
        const { data: { session } } = await supabaseClient.auth.getSession();
        let isOwner = false;
        
        if (session) {
            // Pobieramy partnerstwo, aby wiedzieć czy user jest współwłaścicielem
            const { data: partnership } = await supabaseClient
                .from('account_partnerships')
                .select('*')
                .or(`user_1.eq.${session.user.id},user_2.eq.${session.user.id}`)
                .maybeSingle();

            let userIds = [session.user.id];
            if (partnership) {
                userIds.push(partnership.user_1 === session.user.id ? partnership.user_2 : partnership.user_1);
            }

            const { data: claim } = await supabaseClient
                .from('pet_claims')
                .select('*')
                .in('user_id', userIds)
                .eq('pet_id', profileData.id)
                .maybeSingle();
            
            if (claim) isOwner = true;
        }

        // Pytamy tylko jeśli to NIE jest właściciel
        if (!isOwner) {
            setTimeout(() => {
                const locationModal = document.getElementById('locationModal');
                const confirmBtn = document.getElementById('confirmLocationBtn');
                const cancelBtn = document.getElementById('cancelLocationBtn');

                if (locationModal) {
                    locationModal.classList.remove('hidden');
                    
                    // Obsługa zamknięcia
                    const closeModal = () => locationModal.classList.add('hidden');
                    cancelBtn.onclick = closeModal;

                    // Obsługa potwierdzenia
                    confirmBtn.onclick = () => {
                        closeModal();
                        navigator.geolocation.getCurrentPosition(async (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            
                            try {
                                // 1. Aktualizacja ostatniej lokalizacji w tabeli głównej
                                await supabaseClient
                                    .from('dogs')
                                    .update({ 
                                        'LAST_LAT': lat, 
                                        'LAST_LNG': lng, 
                                        'LAST_SCAN_TIME': new Date().toISOString() 
                                    })
                                    .eq('ID', profileData.id);
                                
                                // 2. Dodanie wpisu do historii skanowań (nowa tabela)
                                await supabaseClient
                                    .from('Nawigacja')
                                    .insert({
                                        'pet_id': profileData.id,
                                        'lat': lat,
                                        'lng': lng
                                    });
                                
                                showResultModal("Lokalizacja wysłana!", "Dziękujemy! Twoja lokalizacja została wysłana do właściciela.", "success");
                            } catch (e) {
                                console.error("Błąd podczas zapisywania lokalizacji:", e);
                            }
                        }, (err) => {
                            console.warn("Błąd geolokalizacji lub brak zgody systemowej:", err);
                        }, { enableHighAccuracy: true, timeout: 10000 });
                    };
                }
            }, 1500);
        }
    }
    
    // Przygotowanie linku tel i sms:
    const ownerPhoneStr = profileData.ownerPhone || "Brak danych";
    const phoneClean = ownerPhoneStr.replace(/\s+/g, '');
    const phoneBtn = document.getElementById('phoneBtn');
    const smsBtn = document.getElementById('smsBtn');
    
    if (phoneClean !== 'Brakdanych' && phoneClean !== 'Brak danych') {
        phoneBtn.href = `tel:${phoneClean}`;
        
        // Różne telefony różnie interpretują linki SMS, '?' działa na Androidzie, a '&' na iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const separator = isIOS ? '&' : '?';

        // Wiadomość SMS z lokalizacją
        const baseSmsMessage = "Hej! Znalazłem Twojego pupila jednak nie widzę nigdzie właściciela w pobliżu. Jeśli pupil się zgubił, to skontaktujmy się! Chętnie pomogę!";
        
        // Uruchamiamy geolokalizację dopiero po kliknięciu w przycisk
        smsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const originalContent = smsBtn.innerHTML;
            
            if ("geolocation" in navigator) {
                // Zmieniamy tekst guzika na czas szukania lokalizacji
                smsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pobieram lokalizację...';
                
                // Próba pobrania lokalizacji z większym timeoutem (15 sekund)
                navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const mapLink = `https://maps.google.com/?q=${lat},${lng}`;
                    const fullMessage = `${baseSmsMessage}\n\nMoja aktualna lokalizacja: ${mapLink}`;
                    
                    smsBtn.innerHTML = originalContent;
                    window.location.href = `sms:${phoneClean}${separator}body=${encodeURIComponent(fullMessage)}`;
                }, (error) => {
                    console.log("Geolocation error or denied:", error);
                    smsBtn.innerHTML = originalContent;
                    // Nawet jak jest błąd lub brak zgody, otwieramy SMS bez lokalizacji po chwili
                    window.location.href = `sms:${phoneClean}${separator}body=${encodeURIComponent(baseSmsMessage)}`;
                }, { 
                    timeout: 15000, 
                    enableHighAccuracy: true,
                    maximumAge: 10000 // Możemy użyć pozycji sprzed 10s, jeśli jest dostępna
                });
            } else {
                window.location.href = `sms:${phoneClean}${separator}body=${encodeURIComponent(baseSmsMessage)}`;
            }
        });
    } else {
        // Ukryj całe sekcje kontaktowe, jeśli brakuje numeru
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) actionButtons.style.display = 'none';
    }

    // Obsługa znaków szczególnych (jeśli istnieją)
    const traitsSection = document.getElementById('traitsSection');
    const dogTraits = document.getElementById('dogTraits');
    
    // Symulacja lub pobranie z danych. Jeśli dane z API mają właściwość dogTraits:
    let traitsData = profileData.dogTraits || ""; 
    
    // Dla celów prezentacji, jeśli tagId to nasz demonstracyjny "12345" i nie ma danych z API:
    if (!profileData.dogTraits && tagId === "12345") {
        traitsData = "Energia: Wysoka, Przyjazny do dzieci, Łasuch, Zawsze chętny do zabawy"; // Przykładowe dane
    }

    if (traitsData && traitsData.trim() !== "" && traitsData !== "Brak danych") {
        traitsSection.classList.remove('hidden');
        const traitsArray = traitsData.split(',').map(t => t.trim());
        dogTraits.innerHTML = '';
        traitsArray.forEach(trait => {
            const span = document.createElement('span');
            span.className = 'trait-tag';
            span.textContent = trait;
            dogTraits.appendChild(span);
        });
    } else {
        traitsSection.classList.add('hidden');
    }

    // Obsługa przycisku Udostępnij
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const shareData = {
                title: `Poznaj ${profileData.dogName}! 🐾`,
                text: `Cześć! Zobacz cyfrowy profil pupila o imieniu ${profileData.dogName}. Znajdziesz tu informacje o jego zdrowiu, charakterze i dane kontaktowe do właściciela. 🐕✨\n\nKliknij, aby poznać go bliżej:`,
                url: window.location.href
            };
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    // Fallback dla przeglądarek bez wsparcia API (np. skopiowanie do schowka)
                    navigator.clipboard.writeText(window.location.href);
                    alert("Skopiowano link do profilu!");
                }
            } catch (err) {
                console.log('Błąd udostępniania:', err);
            }
        });
    }


    // Obsługa lajków (UI + LocalStorage)
    const likeBtn = document.getElementById('likeBtn');
    const likeCount = document.getElementById('likeCount');
    
    if (likeBtn && likeCount) {
        // Pobierz lajki z API, lub 0 jeśli jeszcze nie ma
        let currentLikes = parseInt(profileData.likes) || 0;
        
        // Mockup dla ID 12345 w celach prezentacji
        if (tagId === "12345" && !profileData.likes) {
            currentLikes = 12;
        }
        
        likeCount.textContent = currentLikes;

        const likeStorageKey = `liked_${profileData.secure_id || tagId}`;
        let isLiked = localStorage.getItem(likeStorageKey) === 'true';

        // Inicjalizacja stanu
        if (isLiked) {
            likeBtn.classList.add('liked');
            // Jeśli użytkownik już polubił, a my pobraliśmy to samo API, to liczba już uwzględnia ten lajk.
        }

        likeBtn.addEventListener('click', async () => {
            if (!isLiked) {
                isLiked = true;
                currentLikes++;
                localStorage.setItem(likeStorageKey, 'true');
                likeBtn.classList.add('liked');
                likeCount.textContent = currentLikes;
                
                // Animacja serduszek z guzika
                spawnHearts(likeBtn);
                
                await supabaseClient.from('dogs').update({ 'LAJKI': currentLikes }).eq('ID', profileData.id);
            } else {
                isLiked = false;
                currentLikes--;
                localStorage.setItem(likeStorageKey, 'false');
                likeBtn.classList.remove('liked');
                likeCount.textContent = currentLikes;
                await supabaseClient.from('dogs').update({ 'LAJKI': currentLikes }).eq('ID', profileData.id);
            }
        });

        // Pomocnicza funkcja do animacji serduszek
        function spawnHearts(element, x, y) {
            for (let i = 0; i < 8; i++) { // Zwiększamy liczbę serduszek dla lepszego efektu
                const heart = document.createElement('i');
                heart.className = 'fa-solid fa-heart heart-particle';
                
                if (x !== undefined && y !== undefined) {
                    // Używamy position: fixed w CSS, więc clientX/Y jest OK
                    heart.style.left = (x - 10) + 'px';
                    heart.style.top = (y - 10) + 'px';
                } else if (element) {
                    const rect = element.getBoundingClientRect();
                    heart.style.left = (rect.left + rect.width / 2 - 10) + 'px';
                    heart.style.top = (rect.top - 10) + 'px';
                }
                
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 100 + 50;
                heart.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
                heart.style.setProperty('--dy', (Math.sin(angle) * dist - 50) + 'px');
                
                document.body.appendChild(heart);
                setTimeout(() => heart.remove(), 1000);
            }
        }

        // Logika Double Tap (Wersja Globalna i Pancerna)
        let lastClickTime = 0;
        
        // Zapobieganie zaznaczaniu tekstu przy szybkim klikaniu
        document.body.style.webkitUserSelect = "none";
        document.body.style.userSelect = "none";

        window.addEventListener('pointerup', (e) => {
            // Reaguj tylko jeśli jesteśmy na karcie profilu (lub jej dzieciach)
            const isProfileArea = e.target.closest('.profile-card');
            if (!isProfileArea) return;

            // Ignoruj przyciski menu, ustawień i kolory
            if (e.target.closest('.action-btn') || e.target.closest('.color-circle') || e.target.closest('#settingsBtn')) return;

            const currentTime = new Date().getTime();
            const delta = currentTime - lastClickTime;

            if (delta < 350 && delta > 0) {
                console.log("Double Tap detected at:", e.clientX, e.clientY);
                e.preventDefault();
                
                if (!isLiked) {
                    spawnHearts(null, e.clientX, e.clientY);
                    likeBtn.click();
                } else {
                    spawnHearts(null, e.clientX, e.clientY);
                }
                lastClickTime = 0;
            } else {
                lastClickTime = currentTime;
            }
        });
    }

    // More Options Logic
    const moreOptionsBtn = document.getElementById('moreOptionsBtn');
    const moreOptionsDropdown = document.getElementById('moreOptionsDropdown');
    
    if (moreOptionsBtn && moreOptionsDropdown) {
        moreOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreOptionsDropdown.classList.toggle('hidden');
        });
        
        // Zamykanie po kliknięciu gdziekolwiek indziej
        document.addEventListener('click', (e) => {
            if (!moreOptionsDropdown.contains(e.target) && !moreOptionsBtn.contains(e.target)) {
                moreOptionsDropdown.classList.add('hidden');
            }
        });
    }

    // Theme Switcher Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const colorModalOverlay = document.getElementById('colorModalOverlay');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const colorCircles = document.querySelectorAll('.color-circle');

    if (settingsBtn && colorModalOverlay) {
        settingsBtn.addEventListener('click', () => {
            colorModalOverlay.classList.add('active');
        });

        closeModalBtn.addEventListener('click', () => {
            colorModalOverlay.classList.remove('active');
        });

        // Zamknięcie po kliknięciu poza modalem
        colorModalOverlay.addEventListener('click', (e) => {
            if (e.target === colorModalOverlay) {
                colorModalOverlay.classList.remove('active');
            }
        });

        const currentTheme = localStorage.getItem('appTheme') || 'orange';
        colorCircles.forEach(circle => {
            if (circle.getAttribute('data-color') === currentTheme) {
                circle.classList.add('active');
            }

            circle.addEventListener('click', () => {
                const newTheme = circle.getAttribute('data-color');
                localStorage.setItem('appTheme', newTheme);
                // "po wcisnieciu danego koloru strona odswiezy sie"
                window.location.reload();
            });
        });
    }

    // --- Obsługa autoryzacji na profilu ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    const ownerBadge = document.getElementById('ownerBadge');
    const unauthControls = document.getElementById('unauthControls');
    const authControls = document.getElementById('authControls');
    const modalUserEmail = document.getElementById('modalUserEmail');
    const modalLoginBtn = document.getElementById('modalLoginBtn');
    const modalLogoutBtn = document.getElementById('modalLogoutBtn');
    const modalEditBtn = document.getElementById('modalEditBtn');
    const navStartBtn = document.getElementById('navStartBtn');

    const isMockOwner = urlParams.get('mockOwner') === 'true';
    if (session || isMockOwner) {
        if (navStartBtn) {
            navStartBtn.onclick = () => { window.location.href = 'panel.html'; };
        }
        if (unauthControls) unauthControls.classList.add('hidden');
        if (authControls) authControls.classList.remove('hidden');
        if (modalUserEmail) modalUserEmail.textContent = session ? session.user.email : "test-owner@psiebreloki.pl";

        let isOwner = isMockOwner;
        if (session) {
            // Sprawdzenie czy ten konkretny pies należy do zalogowanego usera LUB jego partnera
            const { data: partnership } = await supabaseClient
                .from('account_partnerships')
                .select('*')
                .or(`user_1.eq.${session.user.id},user_2.eq.${session.user.id}`)
                .maybeSingle();

            let userIds = [session.user.id];
            if (partnership) {
                userIds.push(partnership.user_1 === session.user.id ? partnership.user_2 : partnership.user_1);
            }

            const { data: pairedDogs } = await supabaseClient
                .from('pet_claims')
                .select('pet_id')
                .in('user_id', userIds);

            if (pairedDogs && pairedDogs.some(claim => String(claim.pet_id) === String(profileData.id))) {
                isOwner = true;
            }
        }

        if (isOwner) {
            ownerBadge.classList.remove('hidden');
            if (modalEditBtn) modalEditBtn.classList.remove('hidden');
            
            const historyBtn = document.getElementById('historyBtn');
            if (historyBtn) {
                historyBtn.classList.remove('hidden');
            }

            // Transform Center Button for Owner to Alarm Button
            const centerItem = document.querySelector('.center-item');
            const centerActionBtn = document.querySelector('.center-action-btn');
            const centerSpan = centerItem ? centerItem.querySelector('span') : null;
            
            if (centerActionBtn && centerSpan) {
                // Prevent navigation, change classes, icon and text
                centerActionBtn.removeAttribute('href'); // Remove the link so it doesn't navigate
                centerActionBtn.classList.add('alarm-btn');
                
                const icon = centerActionBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fa-solid fa-bell';
                }
                
                centerSpan.textContent = 'Alarm';
                centerSpan.classList.add('alarm-text');
                
                // If alarm is already active (ZGUBA == true)
                if (profileData.isLost) {
                    centerActionBtn.classList.add('alarm-active');
                    centerSpan.classList.add('alarm-active');
                    centerActionBtn.title = 'Wyłącz alarm';
                } else {
                    centerActionBtn.title = 'Przytrzymaj i przesuń w górę, aby włączyć alarm';
                }

                // --- Gesture Elements Setup ---
                let backdrop = document.querySelector('.alarm-gesture-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'alarm-gesture-backdrop';
                    document.body.appendChild(backdrop);
                }
                
                let track = document.querySelector('.alarm-swipe-track');
                if (!track) {
                    track = document.createElement('div');
                    track.className = 'alarm-swipe-track';
                    track.innerHTML = `
                        <div class="alarm-swipe-guide-text">Przesuń w górę</div>
                        <div class="alarm-swipe-chevrons">
                            <i class="fa-solid fa-chevron-up"></i>
                            <i class="fa-solid fa-chevron-up"></i>
                            <i class="fa-solid fa-chevron-up"></i>
                        </div>
                        <div class="alarm-swipe-indicator">
                            <i class="fa-solid fa-bell"></i>
                        </div>
                    `;
                    document.body.appendChild(track);
                }
                
                let microhint = document.querySelector('.alarm-microhint');
                if (!microhint) {
                    microhint = document.createElement('div');
                    microhint.className = 'alarm-microhint';
                    microhint.textContent = 'Przytrzymaj i przesuń w górę!';
                    document.body.appendChild(microhint);
                }
                
                const indicator = track.querySelector('.alarm-swipe-indicator');
                
                // --- Gesture State Variables ---
                let isPressing = false;
                let holdTimer = null;
                let isGestureMode = false;
                let startY = 0;
                let currentY = 0;
                const swipeThreshold = 75; // Swipe distance in pixels to trigger alarm
                let hintTimeout = null;
                
                // Function to display microhint
                const showMicrohint = (text) => {
                    if (hintTimeout) clearTimeout(hintTimeout);
                    microhint.textContent = text || 'Przytrzymaj i przesuń w górę!';
                    microhint.classList.add('active');
                    hintTimeout = setTimeout(() => {
                        microhint.classList.remove('active');
                    }, 2500);
                };

                // Function to trigger state update to Supabase
                const setAlarmState = async (active) => {
                    // Show a spinner inside the button
                    centerActionBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    try {
                        const { error } = await supabaseClient
                            .from('dogs')
                            .update({ 'ZGUBA': active })
                            .eq('ID', profileData.id);
                        
                        if (error) throw error;
                        
                        // Success! Reload to refresh everything smoothly
                        window.location.reload();
                    } catch (err) {
                        alert("Błąd aktualizacji alarmu: " + err.message);
                        // Restore icon
                        centerActionBtn.innerHTML = '<i class="fa-solid fa-bell"></i>';
                    }
                };

                // --- Gesture Event Handlers ---
                const onStart = (e) => {
                    // If the alarm is ALREADY active, a single click turns it off!
                    if (profileData.isLost) {
                        setAlarmState(false);
                        return;
                    }
                    
                    // Otherwise, require hold and swipe up
                    e.preventDefault();
                    isPressing = true;
                    const pageY = e.touches ? e.touches[0].pageY : e.pageY;
                    startY = pageY;
                    currentY = pageY;
                    
                    // Start timer for "hold for a moment"
                    holdTimer = setTimeout(() => {
                        if (isPressing) {
                            isGestureMode = true;
                            // Play subtle vibration if supported
                            if (navigator.vibrate) {
                                navigator.vibrate(40);
                            }
                            // Show backdrop and track
                            backdrop.classList.add('active');
                            track.classList.add('active');
                            // Reset indicator position
                            indicator.style.transform = 'translateX(-50%) translateY(0)';
                            indicator.style.background = 'linear-gradient(135deg, #e74c3c, #ff6b6b)';
                        }
                    }, 250); // 250ms hold time is perfect sweet spot
                };
                
                const onMove = (e) => {
                    if (!isPressing) return;
                    
                    const pageY = e.touches ? e.touches[0].pageY : e.pageY;
                    currentY = pageY;
                    
                    if (isGestureMode) {
                        e.preventDefault();
                        // Calculate drag distance (positive when swiping up)
                        const dy = startY - currentY;
                        
                        // Limit dragging within the track height (max 110px up, min 0px)
                        const dragY = Math.max(0, Math.min(110, dy));
                        
                        // Translate indicator (Y in CSS translation goes down, so we subtract dragY)
                        indicator.style.transform = `translateX(-50%) translateY(${-dragY}px)`;
                        
                        // Visual feedback when getting close
                        const percent = dragY / swipeThreshold;
                        if (percent >= 1) {
                            indicator.style.background = 'linear-gradient(135deg, #2bc06a, #2ecc71)'; // green for ready
                        } else {
                            indicator.style.background = 'linear-gradient(135deg, #e74c3c, #ff6b6b)';
                        }
                    }
                };
                
                const onEnd = (e) => {
                    if (holdTimer) clearTimeout(holdTimer);
                    
                    if (isPressing) {
                        const dy = startY - currentY;
                        
                        if (isGestureMode) {
                            // Check if drag exceeded threshold
                            if (dy >= swipeThreshold) {
                                // TRIGGER ALARM!
                                if (navigator.vibrate) {
                                    navigator.vibrate([100, 50, 100]);
                                }
                                setAlarmState(true);
                            } else {
                                // Canceled, animate back
                                indicator.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.3s ease';
                                indicator.style.transform = 'translateX(-50%) translateY(0)';
                                indicator.style.background = 'linear-gradient(135deg, #e74c3c, #ff6b6b)';
                                setTimeout(() => {
                                    indicator.style.transition = 'transform 0.05s linear, background 0.3s ease';
                                }, 300);
                            }
                        } else {
                            // Normal quick click when inactive - show hint!
                            showMicrohint('Przytrzymaj i przesuń w górę!');
                        }
                    }
                    
                    // Reset gesture states
                    isPressing = false;
                    isGestureMode = false;
                    backdrop.classList.remove('active');
                    track.classList.remove('active');
                };
                
                // Add event listeners to the action button
                centerActionBtn.addEventListener('mousedown', onStart);
                centerActionBtn.addEventListener('touchstart', onStart, { passive: false });
                
                // Window/document listeners to handle smooth dragging outside the button boundaries
                window.addEventListener('mousemove', onMove);
                window.addEventListener('touchmove', onMove, { passive: false });
                window.addEventListener('mouseup', onEnd);
                window.addEventListener('touchend', onEnd);
                window.addEventListener('mouseleave', (e) => {
                    if (e.target === document.documentElement) {
                        onEnd();
                    }
                });
            }

            
            // Tryb ZGUBA dla właściciela w Ustawieniach
            const ownerSettingsSection = document.getElementById('ownerSettingsSection');
            const settingsLostModeToggle = document.getElementById('settingsLostModeToggle');
            
            ownerSettingsSection.classList.remove('hidden');
            settingsLostModeToggle.checked = profileData.isLost;
            
            settingsLostModeToggle.addEventListener('change', async () => {
                const isChecked = settingsLostModeToggle.checked;
                try {
                    const { error } = await supabaseClient
                        .from('dogs')
                        .update({ 'ZGUBA': isChecked })
                        .eq('ID', profileData.id);
                    
                    if (error) throw error;
                    
                    window.location.reload();
                } catch (err) {
                    alert("Błąd aktualizacji trybu ZGUBA: " + err.message);
                    settingsLostModeToggle.checked = !isChecked;
                }
            });
            
            // Automatyczne otwarcie modala edycji w przypadku przejścia z dashboardu
            if (window.location.hash === '#edit') {
                setTimeout(() => {
                    modalEditBtn.click();
                }, 100);
            }
        }

        modalLogoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
    } else {
        modalLoginBtn.addEventListener('click', () => {
            window.location.href = `login.html?redirectId=${profileData.secure_id}&source=profile`;
        });
        
        if (navStartBtn) {
            navStartBtn.innerHTML = '<i class="fa-solid fa-user"></i><span>Zaloguj</span>';
            navStartBtn.onclick = () => { window.location.href = `login.html?redirectId=${profileData.secure_id}&source=profile`; };
        }
    }

    // --- Modal Edycji ---
    const editModalOverlay = document.getElementById('editModalOverlay');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const editProfileForm = document.getElementById('editProfileForm');

    modalEditBtn.addEventListener('click', () => {
        document.getElementById('colorModalOverlay').classList.remove('active');
        
        document.getElementById('editDogName').value = profileData.dogName !== "Nieznany Pies" ? profileData.dogName : "";
        document.getElementById('editDogAge').value = profileData.dogAge !== "Brak danych" ? profileData.dogAge : "";
        document.getElementById('editDogGender').value = profileData.dogGender || "Brak danych";
        document.getElementById('editDogBreed').value = profileData.dogBreed !== "Brak danych" ? profileData.dogBreed : "";
        // Nie czyścimy opisu jeśli ma domyślny długi string dla bezpieczeństwa, sprawdzamy
        const defaultHealth = "Brak danych. W razie znalezienia psa, natychmiast skontaktuj się z właścicielem lub weterynarzem.";
        document.getElementById('editDogHealth').value = profileData.dogHealth !== defaultHealth ? profileData.dogHealth : "";
        document.getElementById('editOwnerName').value = profileData.ownerName !== "Brak danych" ? profileData.ownerName : "";
        document.getElementById('editOwnerPhone').value = profileData.ownerPhone !== "Brak danych" ? profileData.ownerPhone : "";
        document.getElementById('editImagePreview').src = document.getElementById('dogImage').src;

        editModalOverlay.classList.add('active');
    });

    const clearEditHash = () => {
        if (window.location.hash === '#edit') {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    };

    closeEditModalBtn.addEventListener('click', () => {
        editModalOverlay.classList.remove('active');
        clearEditHash();
    });

    editModalOverlay.addEventListener('click', (e) => {
        if (e.target === editModalOverlay) {
            editModalOverlay.classList.remove('active');
            clearEditHash();
        }
    });

    // --- Location History Modal ---
    const historyBtn = document.getElementById('historyBtn');
    const historyModalOverlay = document.getElementById('historyModalOverlay');
    const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
    const historyList = document.getElementById('historyList');

    if (historyBtn && historyModalOverlay) {
        historyBtn.addEventListener('click', async () => {
            historyModalOverlay.classList.add('active');
            historyList.innerHTML = `
                <div class="loading-history">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
                    <span>Ładowanie historii lokalizacji...</span>
                </div>
            `;

            try {
                // Fetch location scans from "Nawigacja" table
                const { data: scans, error } = await supabaseClient
                    .from('Nawigacja')
                    .select('*')
                    .eq('pet_id', profileData.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (!scans || scans.length === 0) {
                    historyList.innerHTML = `
                        <div class="no-history">
                            <i class="fa-solid fa-location-dot" style="font-size: 2rem; color: var(--text-muted); opacity: 0.5;"></i>
                            <span>Brak zapisanych lokalizacji.</span>
                            <p style="font-size: 0.8rem; font-weight: normal; margin-top: 0.2rem;">Lokalizacja zapisuje się automatycznie, gdy ktoś zeskanuje kod QR z breloka.</p>
                        </div>
                    `;
                    return;
                }

                historyList.innerHTML = '';
                scans.forEach(scan => {
                    // Format date & time nicely in Polish format
                    const date = new Date(scan.created_at);
                    const dateFormatted = date.toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const lat = parseFloat(scan.lat);
                    const lng = parseFloat(scan.lng);

                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.innerHTML = `
                        <div class="history-item-header">
                            <span class="history-item-time"><i class="fa-regular fa-calendar-check" style="color: var(--primary);"></i> ${dateFormatted}</span>
                            <span class="history-item-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
                        </div>
                        <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="history-item-map-btn">
                            <i class="fa-solid fa-map-location-dot"></i> Nawiguj w Google Maps
                        </a>
                    `;
                    historyList.appendChild(item);
                });
            } catch (err) {
                console.error("Błąd ładowania historii:", err);
                historyList.innerHTML = `
                    <div class="no-history">
                        <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: #e74c3c;"></i>
                        <span>Błąd pobierania historii.</span>
                    </div>
                `;
            }
        });

        if (closeHistoryModalBtn) {
            closeHistoryModalBtn.addEventListener('click', () => {
                historyModalOverlay.classList.remove('active');
            });
        }

        historyModalOverlay.addEventListener('click', (e) => {
            if (e.target === historyModalOverlay) {
                historyModalOverlay.classList.remove('active');
            }
        });
    }

    // --- Thank You Modal Lifecycle ---
    const thankYouModalOverlay = document.getElementById('thankYouModalOverlay');
    const closeThankYouBtn = document.getElementById('closeThankYouBtn');

    if (thankYouModalOverlay) {
        if (closeThankYouBtn) {
            closeThankYouBtn.addEventListener('click', () => {
                thankYouModalOverlay.classList.remove('active');
            });
        }

        thankYouModalOverlay.addEventListener('click', (e) => {
            if (e.target === thankYouModalOverlay) {
                thankYouModalOverlay.classList.remove('active');
            }
        });
    }

    const changeImageBtn = document.getElementById('changeImageBtn');
    const editImageInput = document.getElementById('editImageInput');
    const editImagePreview = document.getElementById('editImagePreview');

    changeImageBtn.addEventListener('click', () => editImageInput.click());

    editImageInput.addEventListener('change', () => {
        const file = editImageInput.files[0];
        if (file) {
            editImagePreview.src = URL.createObjectURL(file);
        }
    });

    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    // 0.82 to złoty środek między jakością a wagą pliku
                    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Błąd konwersji")), 'image/jpeg', 0.82);
                };
                img.onerror = () => reject(new Error("Błąd ładowania"));
            };
            reader.onerror = () => reject(new Error("Błąd odczytu"));
        });
    }

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zapisywanie...';
        saveBtn.disabled = true;

        try {
            let photoUrl = profileData.dogPhotoUrl;
            const file = editImageInput.files[0];
            
            if (file) {
                // 1. Usuwanie starego zdjęcia, jeśli istnieje w Supabase
                if (profileData.dogPhotoUrl && profileData.dogPhotoUrl.includes('/storage/v1/object/public/Profil/')) {
                    try {
                        const oldFilename = profileData.dogPhotoUrl.split('/').pop();
                        if (oldFilename) {
                            await supabaseClient.storage.from('Profil').remove([oldFilename]);
                        }
                    } catch (e) {
                        console.warn("Nie udało się usunąć starego zdjęcia:", e);
                    }
                }

                // 2. Wgrywanie nowego zdjęcia
                const compressedBlob = await compressImage(file);
                const filename = `profile_${profileData.id}_${Date.now()}.jpg`;
                const { error: uploadError } = await supabaseClient.storage
                    .from('Profil')
                    .upload(filename, compressedBlob, { contentType: 'image/jpeg' });
                
                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage.from('Profil').getPublicUrl(filename);
                photoUrl = urlData.publicUrl;
            }

            const updates = {
                'IMIE PSA': document.getElementById('editDogName').value || 'Nieznany Pies',
                'WIEK PSA': document.getElementById('editDogAge').value || 'Brak danych',
                'PLEC': document.getElementById('editDogGender').value || 'Brak danych',
                'RASA': document.getElementById('editDogBreed').value || 'Brak danych',
                'INFO': document.getElementById('editDogHealth').value || 'Brak danych',
                'IMIE PANA/I': document.getElementById('editOwnerName').value || 'Brak danych',
                'NR TELEFONU': document.getElementById('editOwnerPhone').value || 'Brak danych',
                'ZDJECIE': photoUrl
            };

            const { error: updateError } = await supabaseClient
                .from('dogs')
                .update(updates)
                .eq('ID', profileData.id);

            if (updateError) throw updateError;
            
            // Przekierowanie na ten sam adres ale BEZ #edit, aby nie otwierać modala ponownie
            window.location.href = window.location.pathname + window.location.search;
        } catch (err) {
            console.error("Zapis błąd", err);
            alert("Błąd podczas zapisywania: " + err.message);
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Zapisz zmiany';
            saveBtn.disabled = false;
        }
    });

    } catch (err) {
        console.error("Critical error during initialization:", err);
    } finally {
        // 4. Ukrycie loadera i pokazanie aplikacji zawsze
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }
});

// --- Rejestracja PWA Service Workera ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
async function checkOwnershipForMap(dogData) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const mapBtn = document.getElementById('mapBtn');
    
    // Sprawdzenie czy użytkownik ma przypisanego tego psa LUB czy jest partnerem właściciela
    const { data: partnership } = await supabaseClient
        .from('account_partnerships')
        .select('*')
        .or(`user_1.eq.${session.user.id},user_2.eq.${session.user.id}`)
        .maybeSingle();

    let userIds = [session.user.id];
    if (partnership) {
        userIds.push(partnership.user_1 === session.user.id ? partnership.user_2 : partnership.user_1);
    }

    const { data: claim } = await supabaseClient
        .from('pet_claims')
        .select('*')
        .in('user_id', userIds)
        .eq('pet_id', dogData.id)
        .maybeSingle();
    
    if (claim && mapBtn) {
        mapBtn.innerHTML = '<i class="fa-solid fa-map-location-dot"></i><span>Mapa</span>';
        mapBtn.onclick = () => {
            window.location.href = `tracking.html?id=${dogData.id}`;
        };
    }

}

// --- Scroll Fade Hint ---
(function() {
    const hint = document.getElementById('scrollFadeHint');
    if (!hint) return;

    const checkScroll = () => {
        const scrollBottom = window.scrollY + window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        // Jeśli strona nie jest wystarczająco długa żeby scrollować - ukryj
        if (docHeight <= window.innerHeight || docHeight - scrollBottom < 80) {
            hint.classList.add('hidden-hint');
        } else {
            hint.classList.remove('hidden-hint');
        }
    };

    // Nasłuchuj na scroll - pojawia/znika reaktywnie
    window.addEventListener('scroll', checkScroll, { passive: true });

    // Sprawdź od razu (DOMContentLoaded mogło już minąć)
    checkScroll();

    // Sprawdź ponownie po załadowaniu async contentu (zdjęcia, dane z Supabase)
    setTimeout(checkScroll, 800);
    setTimeout(checkScroll, 2000);
})();

