// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// -----------------------------

// Globalna funkcja callback dla Google One Tap
window.handleGoogleCallback = async (response) => {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (submitBtn) submitBtn.classList.add('hidden');
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (errorMsg) errorMsg.classList.add('hidden');

    try {
        const { data, error } = await supabaseClient.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
        });

        if (error) throw error;

        // Przekierowanie jak przy zwykłym logowaniu
        const urlParams = new URLSearchParams(window.location.search);
        const redirectId = urlParams.get('redirectId') || '12345';
        const source = urlParams.get('source') || 'dashboard';

        if (source === 'profile') {
            window.location.href = `index.html?id=${redirectId}`;
        } else {
            window.location.href = `panel.html`;
        }
    } catch (error) {
        console.error("Google Auth Error:", error);
        if (errorMsg) {
            errorMsg.textContent = "Błąd logowania przez Google: " + error.message;
            errorMsg.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.classList.remove('hidden');
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectId = urlParams.get('redirectId') || '12345';
    const source = urlParams.get('source') || 'dashboard';

    // Jeśli zalogowany – przekieruj od razu
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        if (source === 'profile') {
            window.location.href = `index.html?id=${redirectId}`;
        } else {
            window.location.href = `panel.html`;
        }
        return;
    }

    // --- Inicjalizacja Google One Tap ---
    const GOOGLE_CLIENT_ID = "208983119617-oa2g6no6tc7e0l508liomch97o257fbv.apps.googleusercontent.com";

    if (window.google) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: "use"
        });

        // 1. Renderuj statyczny przycisk awaryjny (np. dla iOS Safari)
        google.accounts.id.renderButton(
            document.getElementById("googleButtonContainer"),
            { theme: "outline", size: "large", width: 280, shape: "rectangular", text: "continue_with" }
        );

        // 2. Pokaż wyskakujące okienko Google One Tap
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                console.log("One Tap not displayed:", notification.getNotDisplayedReason());
            } else if (notification.isSkippedMoment()) {
                console.log("One Tap skipped:", notification.getSkippedReason());
            }
        });
    }

    const loginForm       = document.getElementById('loginForm');
    const authTabs        = document.querySelectorAll('.auth-tab');
    const displayNameGroup= document.getElementById('displayNameGroup');
    const submitBtn       = document.getElementById('submitBtn');
    const subtitle        = document.getElementById('subtitle');
    const errorMsg        = document.getElementById('errorMsg');
    const successMsg      = document.getElementById('successMsg');
    const loadingIndicator= document.getElementById('loadingIndicator');

    let currentMode = 'login';



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
                displayNameGroup.classList.add('hidden');
                submitBtn.innerHTML = 'Zaloguj się <i class="fa-solid fa-arrow-right"></i>';
                subtitle.textContent = 'Zaloguj się, aby zarządzać brelokami';
            } else {
                displayNameGroup.classList.remove('hidden');
                submitBtn.innerHTML = 'Zarejestruj się <i class="fa-solid fa-arrow-right"></i>';
                subtitle.textContent = 'Stwórz nowe konto';
            }
        });
    });

    // --- Formularz submit ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email       = document.getElementById('email').value.trim();
        const password    = document.getElementById('password').value.trim();
        const displayName = document.getElementById('displayName').value.trim();

        if (!email || !password) return;

        submitBtn.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        successMsg.classList.add('hidden');

        try {
            if (currentMode === 'register') {
                // --- REJESTRACJA ---

                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            display_name: displayName || email.split('@')[0]
                        }
                    }
                });

                if (error) throw error;

                if (data.session) {
                    if (source === 'profile') {
                        window.location.href = `index.html?id=${redirectId}`;
                    } else {
                        window.location.href = `panel.html`;
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
                } else {
                    window.location.href = `panel.html`;
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

// Funkcja przełączania widoczności hasła
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}
