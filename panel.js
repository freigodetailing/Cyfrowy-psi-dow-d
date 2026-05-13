// PWA Installation Logic
let deferredPrompt;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn && !isStandalone) installBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
});

// Dodatkowa inicjalizacja dla urządzeń, gdzie event nie fired (np. iOS)
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn && !isStandalone) {
        // Na iOS zawsze pokazujemy guzik instrukcji, jeśli nie jest zainstalowane
        if (isIOS) {
            installBtn.style.display = 'flex';
        }
    }
});

async function installPWA() {
    if (!deferredPrompt) {
        if (isIOS) {
            alert('Aby zainstalować aplikację na iPhone:\n1. Kliknij ikonę udostępniania (kwadrat ze strzałką na dole)\n2. Przewiń w dół i wybierz "Do ekranu początkowego" (Add to Home Screen)');
        } else {
            alert('Aplikacja jest już zainstalowana lub Twoja przeglądarka nie wspiera automatycznej instalacji. Możesz ją dodać ręcznie przez menu przeglądarki (Ustawienia -> Zainstaluj aplikację).');
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

function getFinalImageUrl(url) {
    if (!url || url === "Brak danych" || url === "" || url === "./dog_sample.png" || url === "./1.png") return "./photos/podstawa.png";
    if (!url.startsWith('http') && !url.startsWith('./photos/')) {
        return `./photos/${url.replace('./', '')}`;
    }
    return url;
}

document.addEventListener("DOMContentLoaded", async () => {
    // --- Sekcja Motywacyjna ---
    const motivations = [
        "Psy potrafią zrozumieć nawet 250 ludzkich słów i gestów. 🧠",
        "Odcisk psiego nosa jest tak unikalny jak linie papilarne człowieka. 👃",
        "Psy mają trzy powieki, z których jedna utrzymuje wilgoć oka. 👀",
        "Merchanie ogonem w prawo oznacza radość, a w lewo – niepewność. 🐕",
        "Najstarszy znany pies na świecie żył aż 29 lat! 🏆",
        "Psy pocą się tylko przez opuszki swoich łap. 🐾",
        "Słuch psa jest dziesięć razy czulszy niż słuch człowieka. 👂",
        "Charty potrafią biec z prędkością nawet 70 km/h. ⚡",
        "Psy widzą kolory, głównie niebieski i żółty. 🌈",
        "Śpiący pies w kulce instynktownie chroni swoje organy. 😴",
        "Psy mają 42 zęby stałe – o 10 więcej niż dorośli ludzie. 🦷",
        "Zmysł węchu psa jest do 100 tysięcy razy lepszy od naszego! 👃",
        "Psy rasy Basenji to jedyne psy na świecie, które nie szczekają. 🔇",
        "Ziewanie psa to często sposób na rozładowanie stresu. 🥱",
        "Psy potrafią wykryć zmiany w ludzkim zapachu wywołane chorobą. 🩺",
        "Dalmatyńczyki rodzą się białe – kropki pojawiają się z czasem. ⚪",
        "Psy pija wodę, zwijając język w kształt łyżeczki. 👅",
        "Border Collie to najinteligentniejsza rasa psów na świecie. 🎓",
        "Psy mają aż 18 mięśni odpowiedzialnych za ruchy każdego ucha. 👂",
        "Dotykanie psiego brzucha wywołuje u nich głęboki relaks. 😌",
        "Psy śnią o tych samych rzeczach co my, np. o zabawie. 💤",
        "Psie łapy mogą pachnieć jak chipsy przez naturalne bakterie. 🍿",
        "Nowofundlandy mają błony pławne, co czyni je świetnymi pływakami. 🏊",
        "Psy potrafią wyczuć burzę na długo przed nami. ⛈️",
        "Męskie psy często pozwalają suczkom wygrywać w zabawach. ♀️",
        "Corgi to w walijskim języku po prostu 'karłowaty pies'. 🏴󠁧󠁢󠁷󠁬󠁳󠁿",
        "Psy kochają kontakt wzrokowy – to uwalnia hormon szczęścia. ❤️",
        "Pinczery miniaturowe uważają się za znacznie większe niż są! 🦁",
        "Psy rasy Lundehund potrafią zamykać uszy przed brudem. 👂",
        "Każdy pies ma swój unikalny 'profil zapachowy'. 🆔",
        "Koty potrafią wydać z siebie ponad 100 różnych dźwięków! 🐱",
        "Mruczenie kota przyspiesza regenerację kości i tkanek. 🦴",
        "Koty śpią średnio przez 12-16 godzin na dobę. 😴",
        "Odcisk nosa kota jest tak unikalny jak u człowieka. 👃",
        "Koty nie czują słodkiego smaku – brak im receptorów. 🍩",
        "Koty potrafią skoczyć na 6-krotność swojej długości! 🚀",
        "Większość dorosłych kotów nie toleruje laktozy. 🚫🥛",
        "Koty chodzą, stawiając najpierw obie prawe łapy. 🐾",
        "Wąsy (wibrysy) pomagają kotu ocenić wielkość przejścia. 📏",
        "Koty mają 32 mięśnie w każdym uchu. 👂",
        "Koty ocierają się o ludzi, by oznaczyć ich jako swoich. 😻",
        "Najstarsza rasa kota to Egipski Mau (ponad 3000 lat). 🇪🇬",
        "Koty mają 230 kości, co daje im niesamowitą gibkość. 🤸",
        "Wolno żyjące koty miau-czą głównie do ludzi. 🗣️",
        "Koty potrafią biec z prędkością do 48 km/h. 💨",
        "Powolne mruganie to koci odpowiednik pocałunku. 😽",
        "Koty pocą się wyłącznie przez opuszki łap. 🐾",
        "Narząd Jacobsona pozwala kotom 'smakować' zapachy. 👅",
        "Koty spędzają 1/3 czasu czuwania na pielęgnacji futra. 🧼",
        "Kocia obojczyk pozwala im wciskać się w małe szczeliny. 😺",
        "Koty potrafią obracać uszami o 180 stopni. 🔄",
        "Koty czują się bezpieczniej w wysokich miejscach. 🏰",
        "Mruganie światłem przez kota oznacza fazę snu REM. 💤",
        "Koty potrafią pić wodę morską dzięki silnym nerkom. 🌊",
        "Białe koty z niebieskimi oczami często są głuche. ⚪",
        "Koty zawsze spadają na cztery łapy (odruch prostowania). 🤸",
        "W starożytnym Egipcie za zabicie kota groziła śmierć. ⚰️",
        "Kot słyszy ultradźwięki niedostępne dla ludzi i psów. 👂",
        "Koty mają unikalne linie papilarne na nosach. 👃",
        "Każda chwila z pupilem to inwestycja w Waszą więź! 🤝"
    ];

    const textElem = document.getElementById('motivationText');
    if (textElem) {
        textElem.textContent = motivations[Math.floor(Math.random() * motivations.length)];
    }

    // Przypomnienie po wyjściu z aplikacji
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if ('Notification' in window && Notification.permission === 'granted') {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'SCHEDULE_REMINDER',
                        message: motivations[Math.floor(Math.random() * motivations.length)]
                    });
                }
            }
        }
    });

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const loggedInState = document.getElementById('loggedInState');
        const loggedOutState = document.getElementById('loggedOutState');
        
        if (!session) {
            loggedInState.classList.add('hidden');
            loggedOutState.classList.remove('hidden');
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            return;
        }

        loggedInState.classList.remove('hidden');
        loggedOutState.classList.add('hidden');

        const userDisplayName = session.user.user_metadata?.display_name || session.user.email;
        document.getElementById('userEmailDisplay').textContent = userDisplayName;
        document.getElementById('modalUserEmail').textContent = session.user.email;

        const settingsModal = document.getElementById('settingsModalOverlay');
        const openSettingsBtn = document.getElementById('openSettingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');

        openSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            settingsModal.classList.add('active');
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.remove('active');
        });


        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = `login.html`;
        });

        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        const deleteModal = document.getElementById('deleteAccountModalOverlay');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                deleteModal.classList.add('active');
            });
        }

        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.classList.remove('active');
        });

        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) deleteModal.classList.remove('active');
        });

        confirmDeleteBtn.addEventListener('click', async () => {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = "USUWANIE...";
            
            try {
                // Najpierw oznaczamy wszystkie powiązane profile jako osierocone
                const { data: userClaims } = await supabaseClient
                    .from('pet_claims')
                    .select('pet_id')
                    .eq('user_id', session.user.id);
                
                if (userClaims && userClaims.length > 0) {
                    const petIds = userClaims.map(c => c.pet_id);
                    await supabaseClient
                        .from('dogs')
                        .update({ 'SIEROTA': new Date().toISOString() })
                        .in('ID', petIds);
                }

                // 1. Usuwamy powiązania (własność) ze wszystkimi brelokami użytkownika
                const { error: deleteClaimsError } = await supabaseClient
                    .from('pet_claims')
                    .delete()
                    .eq('user_id', session.user.id);
                
                if (deleteClaimsError) throw deleteClaimsError;

                // 2. FAKTYCZNE USUNIĘCIE KONTA Z AUTH (wymaga funkcji RPC delete_user_self w Supabase)
                const { error: deleteAuthError } = await supabaseClient.rpc('delete_user_self');
                
                if (deleteAuthError) {
                    console.warn("Błąd RPC (prawdopodobnie brak funkcji w Supabase):", deleteAuthError);
                    // Jeśli RPC nie istnieje, robimy chociaż wylogowanie, ale ostrzegamy użytkownika
                    await supabaseClient.auth.signOut();
                    alert("Dane zostały odpięte, ale Twoje konto logowania nadal istnieje w Auth. Skontaktuj się z administratorem lub dodaj funkcję RPC 'delete_user_self' w SQL Editorze Supabase.");
                } else {
                    // 3. CZYSZCZENIE SESJI LOKALNEJ - bardzo ważne, aby przeglądarka zapomniała o użytkowniku
                    await supabaseClient.auth.signOut();
                    alert("Twoje konto zostało całkowicie usunięte. Wszystkie breloki są teraz wolne i gotowe do ponownego przypisania.");
                }

                window.location.href = 'login.html';
            } catch (err) {
                console.error("Delete account error:", err);
                alert("Błąd podczas usuwania konta: " + err.message);
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = "USUŃ NA STAŁE";
            }
        });

        // --- Unpair Modal Logic ---
        const unpairModal = document.getElementById('unpairModalOverlay');
        const confirmUnpairBtn = document.getElementById('confirmUnpairBtn');
        const cancelUnpairBtn = document.getElementById('cancelUnpairBtn');
        let currentUnpairPetId = null;

        const showUnpairModal = (petId) => {
            currentUnpairPetId = petId;
            unpairModal.classList.add('active');
        };

        cancelUnpairBtn.addEventListener('click', () => {
            unpairModal.classList.remove('active');
            currentUnpairPetId = null;
        });

        unpairModal.addEventListener('click', (e) => {
            if (e.target === unpairModal) {
                unpairModal.classList.remove('active');
                currentUnpairPetId = null;
            }
        });

        confirmUnpairBtn.addEventListener('click', async () => {
            if (!currentUnpairPetId) return;
            
            confirmUnpairBtn.disabled = true;
            confirmUnpairBtn.textContent = "ODŁĄCZANIE...";
            
            try {
                // 1. Usuwamy przypisanie
                const { error: deleteClaimError } = await supabaseClient
                    .from('pet_claims')
                    .delete()
                    .eq('pet_id', currentUnpairPetId);
                
                if (deleteClaimError) throw deleteClaimError;

                // 2. Aktualizujemy SIEROTA
                const { error: updateDogError } = await supabaseClient
                    .from('dogs')
                    .update({ 'SIEROTA': new Date().toISOString() })
                    .eq('ID', currentUnpairPetId);

                if (updateDogError) throw updateDogError;

                unpairModal.classList.remove('active');
                currentUnpairPetId = null;
                alert("Pomyślnie odłączono pupila od konta.");
                await loadUserPets();
            } catch (err) {
                console.error("Unpair error:", err);
                alert("Błąd podczas odłączania: " + err.message);
            } finally {
                confirmUnpairBtn.disabled = false;
                confirmUnpairBtn.textContent = "Chcę odłączyć pupila";
            }
        });

        // Obsługa zmiany kolorów
        const colorCircles = document.querySelectorAll('.color-circle');
        colorCircles.forEach(circle => {
            circle.addEventListener('click', () => {
                const newTheme = circle.getAttribute('data-color');
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('appTheme', newTheme);
            });
        });

        // --- Pairing Logic ---
        const pairingStatus = document.getElementById('pairingStatus');
        const partnerEmail = document.getElementById('partnerEmail');
        const pairingActions = document.getElementById('pairingActions');
        const generateCodeBtn = document.getElementById('generatePairingCodeBtn');
        const pairingCodeDisplay = document.getElementById('pairingCodeDisplay');
        const generatedCodeSection = document.getElementById('generatedCodeSection');
        const showInputBtn = document.getElementById('showPairingInputBtn');
        const enterCodeSection = document.getElementById('enterCodeSection');
        const pairingCodeInput = document.getElementById('pairingCodeInput');
        const submitPairingCodeBtn = document.getElementById('submitPairingCodeBtn');

        let partnerId = null;

        const dashboardGreeting = document.getElementById('dashboardGreeting');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const userNameInput = document.getElementById('userNameInput');
        const saveNameBtn = document.getElementById('saveNameBtn');

        let myDisplayName = session.user.email.split('@')[0];
        let partnerDisplayName = "Partner";

        const loadProfile = async () => {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('display_name')
                .eq('id', session.user.id)
                .maybeSingle();
            
            if (profile && profile.display_name) {
                myDisplayName = profile.display_name;
                if (userNameInput) userNameInput.value = myDisplayName;
            }
        };

        const getPartnerProfile = async (id) => {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('display_name')
                .eq('id', id)
                .maybeSingle();
            return profile ? profile.display_name : "Partner";
        };

        const checkPartnership = async () => {
            const { data: partnership } = await supabaseClient
                .from('account_partnerships')
                .select('*')
                .or(`user_1.eq.${session.user.id},user_2.eq.${session.user.id}`)
                .maybeSingle();

            if (partnership) {
                partnerId = partnership.user_1 === session.user.id ? partnership.user_2 : partnership.user_1;
                partnerDisplayName = await getPartnerProfile(partnerId);
                
                pairingStatus.classList.remove('hidden');
                pairingActions.classList.add('hidden');
                partnerEmail.textContent = partnerDisplayName;
                
                if (dashboardGreeting) {
                    dashboardGreeting.textContent = "Wspólne Konto";
                }
                if (userEmailDisplay) {
                    const formattedMyName = myDisplayName.charAt(0).toUpperCase() + myDisplayName.slice(1);
                    const formattedPartnerName = partnerDisplayName.charAt(0).toUpperCase() + partnerDisplayName.slice(1);
                    userEmailDisplay.innerHTML = `${formattedMyName} <span style="font-size: 0.9em; margin: 0 4px;">🤍</span> ${formattedPartnerName}`;
                }
            } else {
                partnerId = null;
                pairingStatus.classList.add('hidden');
                pairingActions.classList.remove('hidden');
                if (dashboardGreeting) dashboardGreeting.textContent = "Moje Konto";
                if (userEmailDisplay) {
                    const formattedMyName = myDisplayName.charAt(0).toUpperCase() + myDisplayName.slice(1);
                    userEmailDisplay.textContent = formattedMyName;
                }
            }
        };

        await loadProfile();
        await checkPartnership();

        if (saveNameBtn) {
            saveNameBtn.addEventListener('click', async () => {
                const newName = userNameInput.value.trim();
                if (!newName) return;

                saveNameBtn.disabled = true;
                saveNameBtn.textContent = "...";

                const { error } = await supabaseClient
                    .from('profiles')
                    .upsert({ id: session.user.id, display_name: newName, updated_at: new Date().toISOString() });

                if (error) {
                    alert("Błąd podczas zapisywania imienia: " + error.message);
                } else {
                    myDisplayName = newName;
                    await checkPartnership();
                    alert("Imię zostało zapisane!");
                }
                saveNameBtn.disabled = false;
                saveNameBtn.textContent = "Zapisz";
            });
        }

        // --- Unpair Accounts Logic ---
        const unpairAccountsBtn = document.getElementById('unpairAccountsBtn');
        const unpairAccountsModalOverlay = document.getElementById('unpairAccountsModalOverlay');
        const confirmUnpairAccountsBtn = document.getElementById('confirmUnpairAccountsBtn');
        const cancelUnpairAccountsBtn = document.getElementById('cancelUnpairAccountsBtn');

        if (unpairAccountsBtn) {
            unpairAccountsBtn.addEventListener('click', () => {
                unpairAccountsModalOverlay.classList.add('active');
            });
        }

        if (cancelUnpairAccountsBtn) {
            cancelUnpairAccountsBtn.addEventListener('click', () => {
                unpairAccountsModalOverlay.classList.remove('active');
            });
        }

        if (confirmUnpairAccountsBtn) {
            confirmUnpairAccountsBtn.addEventListener('click', async () => {
                confirmUnpairAccountsBtn.disabled = true;
                confirmUnpairAccountsBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Rozłączanie...';

                try {
                    const { error } = await supabaseClient
                        .from('account_partnerships')
                        .delete()
                        .or(`user_1.eq.${session.user.id},user_2.eq.${session.user.id}`);

                    if (error) throw error;

                    unpairAccountsModalOverlay.classList.remove('active');
                    alert("Konta zostały pomyślnie rozłączone.");
                    window.location.reload(); // Najbezpieczniejszy sposób na odświeżenie stanu
                } catch (err) {
                    console.error("Unpair accounts error:", err);
                    alert("Błąd podczas rozłączania kont: " + err.message);
                } finally {
                    confirmUnpairAccountsBtn.disabled = false;
                    confirmUnpairAccountsBtn.textContent = "Tak, rozłącz konta";
                }
            });
        }

        generateCodeBtn.addEventListener('click', async () => {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const { error } = await supabaseClient
                .from('pairing_codes')
                .insert({ code, created_by: session.user.id });

            if (error) {
                alert("Błąd podczas generowania kodu: " + error.message);
            } else {
                pairingCodeDisplay.textContent = code;
                generatedCodeSection.classList.remove('hidden');
                enterCodeSection.classList.add('hidden');
            }
        });

        showInputBtn.addEventListener('click', () => {
            enterCodeSection.classList.remove('hidden');
            generatedCodeSection.classList.add('hidden');
        });

        submitPairingCodeBtn.addEventListener('click', async () => {
            const code = pairingCodeInput.value.trim();
            if (code.length !== 6) return alert("Kod musi mieć 6 cyfr");

            submitPairingCodeBtn.disabled = true;
            submitPairingCodeBtn.textContent = "...";

            try {
                // 1. Check code
                const { data: codeData, error: codeError } = await supabaseClient
                    .from('pairing_codes')
                    .select('created_by')
                    .eq('code', code)
                    .single();

                if (codeError || !codeData) throw new Error("Nieprawidłowy lub wygasły kod.");
                if (codeData.created_by === session.user.id) throw new Error("Nie możesz sparować się ze samym sobą!");

                // 2. Create partnership
                const { error: pairError } = await supabaseClient
                    .from('account_partnerships')
                    .insert({ user_1: codeData.created_by, user_2: session.user.id });

                if (pairError) throw pairError;

                // 3. Delete code
                await supabaseClient.from('pairing_codes').delete().eq('code', code);

                alert("Konta zostały pomyślnie połączone!");
                window.location.reload();
            } catch (err) {
                alert(err.message);
                submitPairingCodeBtn.disabled = false;
                submitPairingCodeBtn.textContent = "Połącz";
            }
        });


        // --- Funkcja ładowania pupili ---
        const loadUserPets = async () => {
            const petsList = document.getElementById('petsList');
            const noPetsState = document.getElementById('noPetsState');
            const addAnotherPetBtn = document.getElementById('addAnotherPetBtn');
            
            petsList.innerHTML = '';
            noPetsState.classList.add('hidden');
            addAnotherPetBtn.classList.add('hidden');

            // Fetch claims for user AND partner
            const userIds = [session.user.id];
            if (partnerId) userIds.push(partnerId);

            const { data: claims } = await supabaseClient
                .from('pet_claims')
                .select('pet_id')
                .in('user_id', userIds);

            if (!claims || claims.length === 0) {
                noPetsState.classList.remove('hidden');
            } else {
                const petIds = claims.map(c => c.pet_id);
                const { data: dogs } = await supabaseClient
                    .from('dogs')
                    .select('ID, "IMIE PSA", ZDJECIE, ZGUBA, LAST_LAT, LAST_LNG')
                    .in('ID', petIds);

                if (dogs && dogs.length > 0) {
                    dogs.forEach(dog => {
                        const imgUrl = getFinalImageUrl(dog['ZDJECIE']);
                        const isLost = dog['ZGUBA'] === true;
                        const card = document.createElement('div');
                        card.className = `pet-card ${isLost ? 'alarm-active' : ''}`;
                        card.style.cursor = 'pointer';
                        card.onclick = (e) => {
                            if (!e.target.closest('.pet-card-edit-btn') && !e.target.closest('.pet-card-unpair-btn') && !e.target.closest('.pet-card-location-btn') && !e.target.closest('.pet-card-widget-btn')) {
                                window.location.href = `index.html?id=${dog.ID}`;
                            }
                        };

                        const statusHtml = isLost 
                            ? `<div class="status-alarm"><span class="status-dot-alarm"></span>Alarm aktywny</div>`
                            : `<div class="status-active"><span class="status-dot"></span>Aktywny</div>`;

                        card.innerHTML = `
                            <img src="${imgUrl}" alt="${dog['IMIE PSA']}" onerror="this.onerror=null; this.src='./photos/podstawa.png';">
                            <div class="pet-card-info">
                                <div class="pet-card-info-header">
                                    <h4>${dog['IMIE PSA']}</h4>
                                    ${statusHtml}
                                </div>
                                <span>Przejdź do wizytówki <i class="fa-solid fa-arrow-right"></i></span>
                            </div>
                            <div class="pet-card-actions">
                                <button class="btn-unpair pet-card-unpair-btn" title="Odłącz pupila">
                                    <i class="fa-solid fa-link-slash"></i>
                                </button>
                                <a href="index.html?id=${dog.ID}#edit" class="pet-card-edit-btn" title="Edytuj profil">
                                    <i class="fa-solid fa-pen"></i>
                                </a>
                            </div>
                        `;
                        
                        const unpairBtn = card.querySelector('.pet-card-unpair-btn');
                        if (unpairBtn) {
                            unpairBtn.onclick = (e) => {
                                e.stopPropagation();
                                showUnpairModal(dog.ID);
                            };
                        }

                        petsList.appendChild(card);
                    });
                    addAnotherPetBtn.classList.remove('hidden');
                } else {
                    noPetsState.classList.remove('hidden');
                }
                return dogs || [];
            }
            return [];
        };

        // Pierwsze ładowanie
        const dogs = await loadUserPets();
        
        // --- Badging API (Czerwona kropka na ikonie, jeśli pies zaginął) ---
        if ('setAppBadge' in navigator) {
            const lostDogsCount = dogs ? dogs.filter(d => d['ZGUBA'] === true).length : 0;
            if (lostDogsCount > 0) {
                navigator.setAppBadge(lostDogsCount).catch(console.error);
            } else {
                navigator.clearAppBadge().catch(console.error);
            }
        }


        // Obsługa akcji z parametrów URL (np. ze skrótów PWA)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'assign') {
            setTimeout(() => {
                const assignBtn = document.querySelector('.assign-nfc-btn');
                if (assignBtn) assignBtn.click();
            }, 500);
        }

        // --- Nowa Logika Przypisywania (ID + NFC) ---
        const nfcModalOverlay = document.getElementById('nfcModalOverlay');
        const assignInitialView = document.getElementById('assignInitialView');
        const assignScanView = document.getElementById('assignScanView');
        const cancelNfcBtn = document.getElementById('cancelNfcBtn');
        const assignManualBtn = document.getElementById('assignManualBtn');
        const manualPetId = document.getElementById('manualPetId');
        const startNfcScanBtn = document.getElementById('startNfcScanBtn');
        const backToInitialBtn = document.getElementById('backToInitialBtn');
        const assignBtns = document.querySelectorAll('.assign-nfc-btn');

        let ndef = null;
        let scanAbortController = null;

        // --- Result Modal Logic ---
        const resultModal = document.getElementById('resultModalOverlay');
        const resultIconContainer = document.getElementById('resultIconContainer');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const closeResultBtn = document.getElementById('closeResultBtn');

        const showResultModal = (isSuccess, title, msg) => {
            if (isSuccess) {
                resultIconContainer.style.background = '#f6ffed';
                resultIconContainer.style.border = '3px solid #b7eb8f';
                resultIcon.className = 'fa-solid fa-check';
                resultIcon.style.color = '#52c41a';
                resultTitle.style.color = '#52c41a';
            } else {
                resultIconContainer.style.background = '#fff1f0';
                resultIconContainer.style.border = '3px solid #ffa39e';
                resultIcon.className = 'fa-solid fa-xmark';
                resultIcon.style.color = '#f5222d';
                resultTitle.style.color = '#f5222d';
            }
            resultTitle.textContent = title;
            resultMessage.textContent = msg;
            resultModal.classList.add('active');
        };

        if (closeResultBtn) {
            closeResultBtn.onclick = () => resultModal.classList.remove('active');
        }
        if (resultModal) {
            resultModal.onclick = (e) => { if (e.target === resultModal) resultModal.classList.remove('active'); };
        }

        const showAssignModal = () => {
            nfcModalOverlay.classList.add('active');
            assignInitialView.classList.remove('hidden');
            assignScanView.classList.add('hidden');
            manualPetId.value = '';
        };

        const hideAssignModal = () => {
            if (scanAbortController) scanAbortController.abort();
            nfcModalOverlay.classList.remove('active');
        };

        assignBtns.forEach(btn => btn.addEventListener('click', showAssignModal));
        cancelNfcBtn.addEventListener('click', hideAssignModal);
        
        nfcModalOverlay.addEventListener('click', (e) => {
            if (e.target === nfcModalOverlay) hideAssignModal();
        });

        backToInitialBtn.addEventListener('click', () => {
            if (scanAbortController) scanAbortController.abort();
            assignInitialView.classList.remove('hidden');
            assignScanView.classList.add('hidden');
        });

        // Funkcja wykonująca samo przypisanie w DB
        const performAssignment = async (tagId) => {
            try {
                // Pobieramy sesję na świeżo przed samym przypisaniem
                const { data: { session: freshSession } } = await supabaseClient.auth.getSession();
                
                if (!freshSession) {
                    showResultModal(false, "Sesja wygasła", "Proszę zalogować się ponownie.");
                    window.location.href = 'login.html';
                    return;
                }

                // 1. Najpierw sprawdzamy, czy taki pies w ogóle istnieje w bazie
                const { data: dogExists, error: fetchError } = await supabaseClient
                    .from('dogs')
                    .select('ID')
                    .eq('ID', tagId)
                    .single();
                
                if (fetchError || !dogExists) {
                    showResultModal(false, "Nieprawidłowy kod", "Brak w bazie pupila o podanym kodzie ID. Sprawdź, czy wpisałeś go poprawnie.");
                    return;
                }

                // 2. Sprawdzamy czy już przypisany do kogoś
                const { data: existing, error: checkError } = await supabaseClient
                    .from('pet_claims')
                    .select('user_id')
                    .eq('pet_id', tagId)
                    .single();
                
                if (existing) {
                    showResultModal(false, "Błąd", "Ten brelok jest już przypisany do innego konta!");
                    return;
                }

                // 3. Wykonujemy przypisanie używając świeżego ID użytkownika
                const { error } = await supabaseClient
                    .from('pet_claims')
                    .insert({ pet_id: tagId, user_id: freshSession.user.id });

                if (error) throw error;

                // Usuwamy status "osierocony", skoro pupil znalazł nowego właściciela (lub tego samego)
                await supabaseClient
                    .from('dogs')
                    .update({ 'SIEROTA': null })
                    .eq('ID', tagId);

                // Sukces
                hideAssignModal();
                showResultModal(true, "Sukces!", "Brelok został pomyślnie przypisany do Twojego konta.");
                await loadUserPets();
            } catch (err) {
                console.error("Assignment error:", err);
                showResultModal(false, "Błąd", "Wystąpił błąd podczas przypisywania: " + err.message);
            }
        };

        // Obsługa ręcznego wpisania ID
        assignManualBtn.addEventListener('click', async () => {
            const idValue = manualPetId.value.trim();
            if (!idValue) {
                showResultModal(false, "Błąd", "Proszę najpierw wpisać kod ID pupila.");
                return;
            }
            assignManualBtn.disabled = true;
            assignManualBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Przypisywanie...';
            
            await performAssignment(idValue);
            
            assignManualBtn.disabled = false;
            assignManualBtn.innerHTML = '<i class="fa-solid fa-check-double"></i> Zatwierdź kod ID';
        });

        // Obsługa Skanowania NFC
        startNfcScanBtn.addEventListener('click', async () => {
            if (!('NDEFReader' in window)) {
                showResultModal(false, "Błąd NFC", "Twoja przeglądarka lub system nie obsługują skanowania NFC wewnątrz strony. Spróbuj zbliżyć brelok do górnej części telefonu bez uruchamiania skanera.");
                return;
            }

            try {
                assignInitialView.classList.add('hidden');
                assignScanView.classList.remove('hidden');
                
                ndef = new NDEFReader();
                scanAbortController = new AbortController();
                
                await ndef.scan({ signal: scanAbortController.signal });

                ndef.onreading = async (event) => {
                    let scannedId = null;
                    for (const record of event.message.records) {
                        if (record.recordType === "url") {
                            const textDecoder = new TextDecoder();
                            const url = textDecoder.decode(record.data);
                            try {
                                const urlObj = new URL(url.startsWith('http') ? url : `https://x.y/${url}`);
                                scannedId = urlObj.searchParams.get('id');
                            } catch(e) {}
                        } else if (record.recordType === "text") {
                            const textDecoder = new TextDecoder();
                            const txt = textDecoder.decode(record.data);
                            if (txt.includes('id=')) {
                                scannedId = txt.split('id=')[1].split('&')[0];
                            }
                        }
                    }

                    if (scannedId) {
                        await performAssignment(scannedId);
                    } else {
                        showResultModal(false, "Błąd", "Odczytano tag, ale nie znaleziono w nim poprawnego ID pupila.");
                        assignInitialView.classList.remove('hidden');
                        assignScanView.classList.add('hidden');
                    }
                };

                ndef.onreadingerror = () => {
                    showResultModal(false, "Błąd", "Wystąpił problem z odczytem taga NFC. Spróbuj ponownie.");
                };

            } catch (error) {
                console.error("NFC error:", error);
                showResultModal(false, "Błąd", "Nie udało się uruchomić skanera NFC. Upewnij się, że funkcja NFC jest włączona w ustawieniach telefonu.");
                assignInitialView.classList.remove('hidden');
                assignScanView.classList.add('hidden');
            }
        });

    } catch (err) {
        console.error("Dashboard error:", err);
    } finally {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }
});
