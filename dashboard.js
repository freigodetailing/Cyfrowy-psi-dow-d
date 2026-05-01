// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pJ30AqPhX_majQPU94l2qQ_6uBAQE64';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getFinalImageUrl(url) {
    if (!url || url === "Brak danych" || url === "" || url === "./dog_sample.png" || url === "./1.png") return "./photos/podstawa.png";
    if (!url.startsWith('http') && !url.startsWith('./photos/')) {
        return `./photos/${url.replace('./', '')}`;
    }
    return url;
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = `login.html?source=dashboard`;
            return;
        }

        document.getElementById('userEmailDisplay').textContent = session.user.email;

        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = `login.html`;
        });

        const { data: claims } = await supabaseClient
            .from('pet_claims')
            .select('pet_id')
            .eq('user_id', session.user.id);

        const petsList = document.getElementById('petsList');
        const noPetsState = document.getElementById('noPetsState');

        if (!claims || claims.length === 0) {
            noPetsState.classList.remove('hidden');
        } else {
            const petIds = claims.map(c => c.pet_id);
            const { data: dogs } = await supabaseClient
                .from('dogs')
                .select('ID, "IMIE PSA", ZDJECIE')
                .in('ID', petIds);

            if (dogs && dogs.length > 0) {
                dogs.forEach(dog => {
                    const imgUrl = getFinalImageUrl(dog['ZDJECIE']);
                    const card = document.createElement('a');
                    card.href = `index.html?id=${dog.ID}`;
                    card.className = 'pet-card';
                    card.innerHTML = `
                        <img src="${imgUrl}" alt="${dog['IMIE PSA']}">
                        <div class="pet-card-info">
                            <h4>${dog['IMIE PSA']}</h4>
                            <span>Przejdź do wizytówki <i class="fa-solid fa-arrow-right"></i></span>
                        </div>
                    `;
                    petsList.appendChild(card);
                });
            } else {
                noPetsState.classList.remove('hidden');
            }
        }
        
        // Zawsze pokaż przycisk 'dodaj kolejny' pod listą, jeśli użytkownik ma jakieś zwierzęta
        if (claims && claims.length > 0) {
            document.getElementById('addAnotherPetBtn').classList.remove('hidden');
        }

        // --- NFC Scanning Logic ---
        const nfcModalOverlay = document.getElementById('nfcModalOverlay');
        const cancelNfcBtn = document.getElementById('cancelNfcBtn');
        const assignBtns = document.querySelectorAll('.assign-nfc-btn');

        let ndef = null;
        let scanAbortController = null;

        const startNfcScan = async () => {
            if (!('NDEFReader' in window)) {
                alert("Twoja przeglądarka (np. iPhone Safari) nie obsługuje natywnego skanowania wewnątrz strony. Przyłóż brelok do górnej części telefonu. Gdy otworzy się przeglądarka z wizytówką pupila, wejdź w 'Zaloguj' w Ustawieniach, aby go przypisać!");
                return;
            }

            try {
                nfcModalOverlay.classList.add('active');
                ndef = new NDEFReader();
                scanAbortController = new AbortController();
                
                await ndef.scan({ signal: scanAbortController.signal });

                ndef.onreading = async (event) => {
                    let scannedUrl = null;
                    for (const record of event.message.records) {
                        if (record.recordType === "url") {
                            const textDecoder = new TextDecoder();
                            scannedUrl = textDecoder.decode(record.data);
                            break;
                        } else if (record.recordType === "text") {
                            const textDecoder = new TextDecoder();
                            const txt = textDecoder.decode(record.data);
                            if (txt.includes('index.html?id=')) scannedUrl = txt;
                        }
                    }

                    if (scannedUrl) {
                        try {
                            const urlObj = new URL(scannedUrl.startsWith('http') ? scannedUrl : `https://example.com/${scannedUrl}`);
                            const tagId = urlObj.searchParams.get('id');
                            
                            if (tagId) {
                                nfcModalOverlay.querySelector('h3').textContent = "Sukces!";
                                nfcModalOverlay.querySelector('p').textContent = "Brelok przypisany! Przekierowuję...";
                                
                                await supabaseClient
                                    .from('pet_claims')
                                    .insert({ pet_id: tagId, user_id: session.user.id });

                                setTimeout(() => {
                                    window.location.href = `index.html?id=${tagId}`;
                                }, 1000);
                            } else {
                                alert("Odczytano tag, ale nie znaleziono prawidłowego ID pupila.");
                            }
                        } catch (e) {
                            alert("Błąd parsowania adresu URL z taga.");
                        }
                    } else {
                        alert("To nie jest odpowiedni brelok (brak URL).");
                    }
                };

                ndef.onreadingerror = () => {
                    alert("Błąd odczytu taga NFC. Spróbuj przyłożyć go jeszcze raz.");
                };

            } catch (error) {
                console.log(error);
                alert("Nie udało się uruchomić skanera NFC. Upewnij się, że masz włączone NFC w ustawieniach telefonu.");
                nfcModalOverlay.classList.remove('active');
            }
        };

        const stopNfcScan = () => {
            if (scanAbortController) {
                scanAbortController.abort();
            }
            nfcModalOverlay.classList.remove('active');
            nfcModalOverlay.querySelector('h3').textContent = "Skanowanie NFC";
            nfcModalOverlay.querySelector('p').textContent = "Zbliż przypinany brelok do tylnej części telefonu...";
        };

        assignBtns.forEach(btn => {
            btn.addEventListener('click', startNfcScan);
        });

        cancelNfcBtn.addEventListener('click', stopNfcScan);

        nfcModalOverlay.addEventListener('click', (e) => {
            if (e.target === nfcModalOverlay) stopNfcScan();
        });
    } catch (error) {
        console.error("Dashboard error:", error);
    } finally {
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
