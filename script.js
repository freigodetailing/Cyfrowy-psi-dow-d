// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pJ30AqPhX_majQPU94l2qQ_6uBAQE64';
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
    ownerPhone: "Brak danych"
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
                likes: data['LAJKI']
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
    
    // Fallback dla celów demonstracyjnych
    if (!tagId) {
        tagId = "12345";
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

    // Obsługa przycisku Forum
    const forumBtn = document.getElementById('forumBtn');
    if (forumBtn) {
        forumBtn.addEventListener('click', () => {
            window.location.href = `forum.html?id=${tagId}`;
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
    } catch (err) {
        console.error("Critical error during initialization:", err);
    } finally {
        // 4. Ukrycie loadera i pokazanie aplikacji zawsze
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }
});
