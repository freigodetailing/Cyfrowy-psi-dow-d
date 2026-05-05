// PWA Installation Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
});

async function installPWA() {
    if (!deferredPrompt) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            alert('Aby zainstalować na iPhone:\n1. Kliknij ikonę udostępniania (kwadrat ze strzałką)\n2. Wybierz "Do ekranu początkowego"');
        } else {
            alert('Aplikacja jest już zainstalowana lub Twoja przeglądarka nie wspiera tej funkcji.');
        }
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
}

// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
    dogName: "Nieznany Pies",
    dogAge: "Brak danych",
    dogPhotoUrl: "./photos/podstawa.png",
    dogHealth: "Brak danych. W razie znalezienia psa, natychmiast skontaktuj się z właścicielem lub weterynarzem.",
    ownerName: "Brak danych",
    ownerPhone: "Brak danych",
    isLost: false
};

async function fetchDogData(tagId) {
    try {
        // Pobieranie danych z bazy Supabase
        const { data, error } = await supabaseClient
            .from('dogs')
            .select('*')
            .eq('ID', tagId)
            .single();

        if (error) {
            console.error("Supabase Error: ", error.message);
            return DEFAULT_PROFILE;
        }
        
        if (data && data['IMIE PSA']) {
            return {
                id: data['ID'],
                dogName: data['IMIE PSA'],
                dogAge: data['WIEK PSA'],
                ownerName: data['IMIE PANA/I'],
                ownerPhone: data['NR TELEFONU'],
                dogHealth: data['INFO'],
                dogPhotoUrl: data['ZDJECIE'],
                likes: data['LAJKI'],
                isLost: data['ZGUBA'] || false,
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
    
    // Automatyczne kalkulowanie wieku, jeśli została podana data (lub tekst bezpośrednio z API)
    document.getElementById('dogAge').textContent = calculateAge(profileData.dogAge);
    
    // Obsługa braku zdjęcia (szary placeholder)
    let finalImageUrl = profileData.dogPhotoUrl;
    if (!finalImageUrl || finalImageUrl === "./dog_sample.png" || finalImageUrl === "Brak danych" || finalImageUrl === "" || finalImageUrl === "./1.png") {
        finalImageUrl = "./photos/podstawa.png";
    } else if (!finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('./photos/')) {
        // Jeśli w arkuszu jest sama nazwa pliku (np. "1.jpg") albo "./1.jpg"
        finalImageUrl = finalImageUrl.replace('./', '');
        finalImageUrl = `./photos/${finalImageUrl}`;
    }
    document.getElementById('dogImage').src = finalImageUrl;
    
    document.getElementById('dogHealth').textContent = profileData.dogHealth;
    document.getElementById('ownerName').textContent = profileData.ownerName;
    
    // Obsługa przycisku mapy
    const mapBtn = document.getElementById('mapBtn');
    if (mapBtn) {
        mapBtn.onclick = () => {
            window.location.href = `tracking.html?id=${tagId}`;
        };
        // Sprawdzamy czy użytkownik jest właścicielem, aby pokazać przycisk
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
            const { data: claim } = await supabaseClient
                .from('pet_claims')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('pet_id', tagId)
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
                                    .eq('ID', tagId);
                                
                                // 2. Dodanie wpisu do historii skanowań (nowa tabela)
                                await supabaseClient
                                    .from('Nawigacja')
                                    .insert({
                                        'pet_id': tagId,
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
        const baseSmsMessage = "Hej! Znalazłem Twojego pupila jednak nie widzę nigdzie właściciela w pobliżu. Jeśli pies się zgubił, to skontaktujmy się! Chętnie pomogę!";
        
        // Uruchamiamy geolokalizację dopiero po kliknięciu w przycisk
        smsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const originalContent = smsBtn.innerHTML;
            
            if ("geolocation" in navigator) {
                // Zmieniamy tekst guzika na czas szukania lokalizacji
                smsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Chwila...';
                
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
                    // Nawet jak jest błąd lub brak zgody, otwieramy SMS bez lokalizacji
                    window.location.href = `sms:${phoneClean}${separator}body=${encodeURIComponent(baseSmsMessage)}`;
                }, { timeout: 8000, enableHighAccuracy: true });
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
                title: `Profil Psa - ${profileData.dogName}`,
                text: `Sprawdź cyfrowy profil psa o imieniu ${profileData.dogName}!`,
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

        const likeStorageKey = `liked_${tagId}`;
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
                
                // Animacja wybuchających serduszek
                for (let i = 0; i < 6; i++) {
                    const heart = document.createElement('i');
                    heart.className = 'fa-solid fa-heart heart-particle';
                    const rect = likeBtn.getBoundingClientRect();
                    heart.style.left = (rect.left + rect.width / 2 - 10) + 'px';
                    heart.style.top = (rect.top - 10) + 'px';
                    heart.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
                    heart.style.setProperty('--dy', (Math.random() * -40 - 20) + 'px');
                    document.body.appendChild(heart);
                    setTimeout(() => heart.remove(), 1000);
                }
                
                // Wysłanie zapisu do Supabase
                const { error } = await supabaseClient.from('dogs').update({ 'LAJKI': currentLikes }).eq('ID', tagId);
                if (error) {
                    console.error("Błąd zapisu lajka", error);
                    alert("Nie udało się zapisać lajka w bazie: " + error.message);
                }
                
            } else {
                isLiked = false;
                currentLikes--;
                localStorage.setItem(likeStorageKey, 'false');
                likeBtn.classList.remove('liked');
                likeCount.textContent = currentLikes;
                
                // Wysłanie cofnięcia zapisu do Supabase
                const { error } = await supabaseClient.from('dogs').update({ 'LAJKI': currentLikes }).eq('ID', tagId);
                if (error) {
                    console.error("Błąd zapisu un-lajka", error);
                    alert("Nie udało się cofnąć lajka w bazie: " + error.message);
                }
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

    if (session) {
        unauthControls.classList.add('hidden');
        authControls.classList.remove('hidden');
        modalUserEmail.textContent = session.user.email;

        // Sprawdzenie czy ten konkretny pies należy do zalogowanego usera
        const { data: pairedDogs } = await supabaseClient.from('pet_claims').select('pet_id').eq('user_id', session.user.id);
        if (pairedDogs && pairedDogs.some(claim => claim.pet_id === tagId)) {
            ownerBadge.classList.remove('hidden');
            modalEditBtn.classList.remove('hidden');
            
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
                        .eq('ID', tagId);
                    
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
            window.location.href = `login.html?redirectId=${tagId}&source=profile`;
        });
    }

    // --- Modal Edycji ---
    const editModalOverlay = document.getElementById('editModalOverlay');
    const closeEditModalBtn = document.getElementById('closeEditModalBtn');
    const editProfileForm = document.getElementById('editProfileForm');

    modalEditBtn.addEventListener('click', () => {
        document.getElementById('colorModalOverlay').classList.remove('active');
        
        document.getElementById('editDogName').value = profileData.dogName !== "Nieznany Pies" ? profileData.dogName : "";
        document.getElementById('editDogAge').value = profileData.dogAge !== "Brak danych" ? profileData.dogAge : "";
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
                const filename = `profile_${tagId}_${Date.now()}.jpg`;
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
                'INFO': document.getElementById('editDogHealth').value || 'Brak danych',
                'IMIE PANA/I': document.getElementById('editOwnerName').value || 'Brak danych',
                'NR TELEFONU': document.getElementById('editOwnerPhone').value || 'Brak danych',
                'ZDJECIE': photoUrl
            };

            const { error: updateError } = await supabaseClient
                .from('dogs')
                .update(updates)
                .eq('ID', tagId);

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
    
    // Sprawdzamy czy użytkownik ma przypisanego tego psa (tabela pet_claims)
    const { data: claim } = await supabaseClient
        .from('pet_claims')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('pet_id', dogData.id)
        .maybeSingle();
    
    if (claim && mapBtn) {
        mapBtn.style.display = 'flex';
        mapBtn.addEventListener('click', () => {
            window.location.href = `tracking.html?id=${dogData.id}`;
        });
    }

    // Jeśli użytkownik jest właścicielem, pokazujemy przycisk spaceru
    if (claim) {
        const walkBtn = document.getElementById('walkSectionBtn');
        if (walkBtn) {
            walkBtn.classList.remove('hidden');
            walkBtn.onclick = () => {
                window.location.href = `walk.html?id=${dogData.id}`;
            };
        }
    }
}
