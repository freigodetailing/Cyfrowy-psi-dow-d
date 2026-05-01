// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pJ30AqPhX_majQPU94l2qQ_6uBAQE64';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// -----------------------------

// Wyciąga ID z URLa zapisanego na tagu NFC (np. "https://.../index.html?id=2" → "2")
function extractPetIdFromUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);
        return url.searchParams.get('id');
    } catch {
        // Może być sam numer
        const trimmed = rawUrl.trim();
        if (/^\d+$/.test(trimmed)) return trimmed;
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectId = urlParams.get('redirectId') || '12345';
    const source = urlParams.get('source') || 'forum';

    // Jeśli zalogowany – przekieruj od razu
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        if (source === 'profile') {
            window.location.href = `index.html?id=${redirectId}`;
        } else if (source === 'dashboard') {
            window.location.href = `dashboard.html`;
        } else {
            window.location.href = `forum.html?id=${redirectId}`;
        }
        return;
    }

    const loginForm       = document.getElementById('loginForm');
    const authTabs        = document.querySelectorAll('.auth-tab');
    const petIdGroup      = document.getElementById('petIdGroup');
    const displayNameGroup= document.getElementById('displayNameGroup');
    const submitBtn       = document.getElementById('submitBtn');
    const subtitle        = document.getElementById('subtitle');
    const errorMsg        = document.getElementById('errorMsg');
    const successMsg      = document.getElementById('successMsg');
    const loadingIndicator= document.getElementById('loadingIndicator');
    const nfcScanArea     = document.getElementById('nfcScanArea');
    const petIdInput      = document.getElementById('petId');
    const petIdStatus     = document.getElementById('petIdStatus');

    let currentMode = 'login';
    let isScanning = false;

    // --- Obsługa skanowania NFC w tle (bez przycisku) ---
    if (petIdInput) {
        // Uruchamiamy skanowanie, gdy użytkownik dotknie pola tekstowego
        petIdInput.addEventListener('focus', async () => {
            if (!('NDEFReader' in window)) {
                // Jeśli urządzenie/przeglądarka nie wspiera Web NFC (np. iOS Safari)
                // użytkownik i tak po prostu może ręcznie wpisać tekst
                return;
            }

            if (isScanning) return; // Zapobiega wielokrotnemu uruchamianiu

            try {
                isScanning = true;
                petIdStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Oczekuję...';
                petIdStatus.style.color = '#888';

                const ndef = new NDEFReader();
                // await ndef.scan() "rezerwuje" tagi NFC dla tej karty przeglądarki,
                // blokując otwarcie nowej karty po zbliżeniu breloka.
                await ndef.scan();

                ndef.addEventListener("reading", ({ message }) => {
                    for (const record of message.records) {
                        let value = '';
                        if (record.recordType === "url") {
                            const decoder = new TextDecoder();
                            value = decoder.decode(record.data);
                        } else if (record.recordType === "text") {
                            const decoder = new TextDecoder(record.encoding || 'utf-8');
                            value = decoder.decode(record.data);
                        }
                        const petId = extractPetIdFromUrl(value);
                        if (petId) {
                            petIdInput.value = petId;
                            petIdStatus.textContent = '✓ Odczytano';
                            petIdStatus.style.color = 'green';
                            petIdInput.blur(); // Zamyka klawiaturę na telefonie po pomyślnym odczycie
                            break;
                        }
                    }
                });

            } catch (err) {
                console.error("NFC Error:", err);
                petIdStatus.textContent = '';
                isScanning = false;
            }
        });
    }

    // --- Zakładki Login / Rejestracja ---
    authTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.getAttribute('data-mode');
            errorMsg.classList.add('hidden');
            successMsg.classList.add('hidden');

            if (currentMode === 'login') {
                petIdGroup.classList.add('hidden');
                displayNameGroup.classList.add('hidden');
                submitBtn.innerHTML = 'Zaloguj się <i class="fa-solid fa-arrow-right"></i>';
                subtitle.textContent = 'Zaloguj się, aby rozmawiać z innymi';
            } else {
                petIdGroup.classList.remove('hidden');
                displayNameGroup.classList.remove('hidden');
                submitBtn.innerHTML = 'Zarejestruj się <i class="fa-solid fa-arrow-right"></i>';
                subtitle.textContent = 'Stwórz nowe konto na forum';
            }
        });
    });

    // --- Formularz submit ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email       = document.getElementById('email').value.trim();
        const password    = document.getElementById('password').value.trim();
        const displayName = document.getElementById('displayName').value.trim();
        const petId       = petIdInput.value.trim();

        if (!email || !password) return;

        submitBtn.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        successMsg.classList.add('hidden');

        try {
            if (currentMode === 'register') {
                // --- REJESTRACJA ---

                // Sprawdź najpierw czy petId nie jest już zajęty
                if (petId) {
                    const { data: existingClaim } = await supabaseClient
                        .from('pet_claims')
                        .select('id')
                        .eq('pet_id', petId)
                        .maybeSingle();

                    if (existingClaim) {
                        throw new Error('Ten brelok (ID: ' + petId + ') jest już przypisany do innego konta. Skontaktuj się z administratorem.');
                    }
                }

                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            display_name: displayName || email.split('@')[0],
                            pet_id: petId || null
                        }
                    }
                });

                if (error) throw error;

                // Zapisz parowanie w pet_claims jeśli podano petId
                if (data.user && petId) {
                    const { error: claimError } = await supabaseClient
                        .from('pet_claims')
                        .insert({ pet_id: petId, user_id: data.user.id });

                    if (claimError) {
                        console.error("Błąd zapisu parowania:", claimError.message);
                    }
                }

                if (data.session) {
                    if (source === 'profile') {
                        window.location.href = `index.html?id=${redirectId}`;
                    } else {
                        window.location.href = `forum.html?id=${redirectId}`;
                    }
                } else {
                    successMsg.textContent = 'Rejestracja udana! Sprawdź swoją skrzynkę e-mail i kliknij link weryfikacyjny.';
                    successMsg.classList.remove('hidden');

                    // Animacja confetti (psie łapki) na sukces
                    for (let i = 0; i < 40; i++) {
                        const paw = document.createElement('i');
                        paw.className = 'fa-solid fa-paw paw-confetti';
                        paw.style.setProperty('--startX', (Math.random() * window.innerWidth) + 'px');
                        paw.style.setProperty('--endX', (Math.random() * window.innerWidth) + 'px');
                        paw.style.setProperty('--rot', (Math.random() * 360) + 'deg');
                        paw.style.setProperty('--duration', (1.5 + Math.random() * 2) + 's');
                        paw.style.left = '0';
                        document.body.appendChild(paw);
                        setTimeout(() => paw.remove(), 4000);
                    }
                }

            } else {
                // --- LOGOWANIE ---
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                if (source === 'profile') {
                    window.location.href = `index.html?id=${redirectId}`;
                } else if (source === 'dashboard') {
                    window.location.href = `dashboard.html`;
                } else {
                    window.location.href = `forum.html?id=${redirectId}`;
                }
            }

        } catch (error) {
            console.error("Auth Error:", error);
            let msg = error.message || 'Wystąpił błąd. Spróbuj ponownie.';
            if (error.message.includes('Invalid login credentials')) {
                msg = 'Nieprawidłowy e-mail lub hasło.';
            } else if (error.message.includes('User already registered')) {
                msg = 'Konto z tym e-mailem już istnieje. Zaloguj się.';
            } else if (error.message.includes('Password should be at least')) {
                msg = 'Hasło musi mieć co najmniej 6 znaków.';
            }
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
        } finally {
            submitBtn.classList.remove('hidden');
            loadingIndicator.classList.add('hidden');
        }
    });
});

// --- Rejestracja PWA Service Workera ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}
