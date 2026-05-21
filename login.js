// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// -----------------------------

let isRecoveryMode = false;

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        isRecoveryMode = true;
        if (window.switchMode) {
            window.switchMode('update-password');
        }
    }
});

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

    // Sprawdź czy to link odzyskiwania hasła (z hash lub ze zdarzenia)
    const isRecoveryHash = window.location.hash && window.location.hash.includes('type=recovery');
    if (isRecoveryHash) isRecoveryMode = true;

    // Jeśli zalogowany – przekieruj od razu (ale NIE w przypadku odzyskiwania hasła)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && !isRecoveryMode) {
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
        initGoogle();
    } else {
        const googleWaitInterval = setInterval(() => {
            if (window.google) {
                clearInterval(googleWaitInterval);
                initGoogle();
            }
        }, 100);
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(googleWaitInterval), 5000);
    }

    function initGoogle() {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            context: "use"
        });

        const btnContainer = document.getElementById("googleButtonContainer");
        if (btnContainer) {
            // 1. Renderuj statyczny przycisk awaryjny
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "outline", size: "large", width: 280, shape: "rectangular", text: "continue_with" }
            );
        }

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
    const authTabsContainer = document.querySelector('.auth-tabs');
    const displayNameGroup= document.getElementById('displayNameGroup');
    const passwordGroup   = document.getElementById('passwordGroup');
    const passwordInput   = document.getElementById('password');
    const submitBtn       = document.getElementById('submitBtn');
    const subtitle        = document.getElementById('subtitle');
    const errorMsg        = document.getElementById('errorMsg');
    const successMsg      = document.getElementById('successMsg');
    const loadingIndicator= document.getElementById('loadingIndicator');
    const mainTitle       = document.getElementById('mainTitle');
    
    // UI elements to hide during forgot password
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const googleDivider   = document.getElementById('googleDivider');
    const googleBtn       = document.getElementById('googleButtonContainer');

    let currentMode = 'login';

    // Global switchMode for HTML onclick
    window.switchMode = (mode) => {
        currentMode = mode;
        errorMsg.classList.add('hidden');
        successMsg.classList.add('hidden');
        
        if (mode === 'login' || mode === 'register') {
            authTabsContainer.style.display = 'flex';
            passwordGroup.classList.remove('hidden');
            passwordInput.required = true;
            forgotPasswordLink.classList.remove('hidden');
            backToLoginLink.classList.add('hidden');
            if (googleDivider) googleDivider.classList.remove('hidden');
            if (googleBtn) googleBtn.style.display = 'flex';
            
            authTabs.forEach(t => t.classList.remove('active'));
            document.querySelector(`.auth-tab[data-mode="${mode}"]`).classList.add('active');

            if (mode === 'login') {
                displayNameGroup.classList.add('hidden');
                submitBtn.innerHTML = 'Zaloguj się';
                subtitle.textContent = 'Zaloguj się, aby zarządzać brelokami';
                if(mainTitle) mainTitle.textContent = 'Dołącz do Nas';
            } else {
                displayNameGroup.classList.remove('hidden');
                submitBtn.innerHTML = 'Zarejestruj się';
                subtitle.textContent = 'Stwórz nowe konto';
                if(mainTitle) mainTitle.textContent = 'Dołącz do Nas';
            }
        } else if (mode === 'forgot') {
            authTabsContainer.style.display = 'none';
            displayNameGroup.classList.add('hidden');
            passwordGroup.classList.add('hidden');
            passwordInput.required = false;
            forgotPasswordLink.classList.add('hidden');
            backToLoginLink.classList.remove('hidden');
            if (googleDivider) googleDivider.classList.add('hidden');
            if (googleBtn) googleBtn.style.display = 'none';
            
            submitBtn.innerHTML = 'Zresetuj hasło';
            subtitle.textContent = 'Podaj adres e-mail przypisany do konta';
            if(mainTitle) mainTitle.textContent = 'Pomożemy Ci odzyskać konto';
        } else if (mode === 'update-password') {
            authTabsContainer.style.display = 'none';
            displayNameGroup.classList.add('hidden');
            document.getElementById('email').parentElement.classList.add('hidden'); // ukryj pole email
            document.getElementById('email').required = false;
            passwordGroup.classList.remove('hidden');
            passwordInput.required = true;
            forgotPasswordLink.classList.add('hidden');
            backToLoginLink.classList.add('hidden');
            if (googleDivider) googleDivider.classList.add('hidden');
            if (googleBtn) googleBtn.style.display = 'none';
            
            submitBtn.innerHTML = 'Ustaw nowe hasło';
            subtitle.textContent = 'Wpisz swoje nowe bezpieczne hasło';
            if(mainTitle) mainTitle.textContent = 'Pomożemy Ci odzyskać konto';
        }
    };

    // --- Zakładki Login / Rejestracja ---
    authTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            switchMode(tab.getAttribute('data-mode'));
        });
    });
    
    // --- Check hash for password recovery ---
    if (isRecoveryMode) {
        switchMode('update-password');
    }

    // --- Formularz submit ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email       = document.getElementById('email').value.trim();
        const password    = document.getElementById('password').value.trim();
        const displayName = document.getElementById('displayName').value.trim();

        submitBtn.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        errorMsg.classList.add('hidden');
        successMsg.classList.add('hidden');

        try {
            if (currentMode === 'register') {
                if (!email || !password) throw new Error("Wypełnij e-mail i hasło.");
                // --- REJESTRACJA ---
                const { data, error } = await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { display_name: displayName || email.split('@')[0] } }
                });

                if (error) throw error;

                if (data.session) {
                    window.location.href = source === 'profile' ? `index.html?id=${redirectId}` : `panel.html`;
                } else {
                    successMsg.textContent = 'Rejestracja udana! Sprawdź skrzynkę e-mail i kliknij link weryfikacyjny.';
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

            } else if (currentMode === 'login') {
                if (!email || !password) throw new Error("Wypełnij e-mail i hasło.");
                // --- LOGOWANIE ---
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = source === 'profile' ? `index.html?id=${redirectId}` : `panel.html`;
                
            } else if (currentMode === 'forgot') {
                if (!email) throw new Error("Podaj e-mail do zresetowania hasła.");
                // --- ZAPOMNIAŁEM HASŁA ---
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + window.location.pathname,
                });
                if (error) throw error;
                
                successMsg.textContent = 'Wysłaliśmy na Twój e-mail link do zmiany hasła. Sprawdź skrzynkę i kliknij w niego.';
                successMsg.classList.remove('hidden');
                
            } else if (currentMode === 'update-password') {
                if (!password) throw new Error("Podaj nowe hasło.");
                // --- USTAWIANIE NOWEGO HASŁA ---
                const { error } = await supabaseClient.auth.updateUser({ password });
                if (error) throw error;
                
                // Remove hash from URL securely
                window.history.replaceState(null, null, window.location.pathname);
                successMsg.textContent = 'Hasło zostało zmienione pomyślnie! Zaraz zostaniesz zalogowany.';
                successMsg.classList.remove('hidden');
                
                setTimeout(() => {
                    window.location.href = source === 'profile' ? `index.html?id=${redirectId}` : `panel.html`;
                }, 2000);
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
