// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pJ30AqPhX_majQPU94l2qQ_6uBAQE64';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
});

const DEFAULT_PROFILE = {
    dogName: "Nieznany Pies",
    dogPhotoUrl: "./photos/podstawa.png",
    dogAge: "Brak danych",
    ownerName: "Brak danych",
    ownerPhone: "Brak danych",
    dogHealth: "Brak danych",
    dogTraits: "",
    likes: 0
};

async function fetchDogData(tagId) {
    try {
        const { data, error } = await supabaseClient
            .from('dogs').select('*').eq('ID', tagId).single();
        if (error) return DEFAULT_PROFILE;
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
        }
        return DEFAULT_PROFILE;
    } catch {
        return DEFAULT_PROFILE;
    }
}

function getFinalImageUrl(profileData) {
    let url = profileData.dogPhotoUrl;
    if (!url || url === "Brak danych" || url === "") return "./photos/podstawa.png";
    if (!url.startsWith('http') && !url.startsWith('./photos/')) {
        url = `./photos/${url.replace('./', '')}`;
    }
    return url;
}

// Formatuje czas wiadomości do HH:MM (strefa Warszawa)
function formatMsgTime(isoString) {
    if (!isoString) return '';
    return new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'Europe/Warsaw',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(isoString));
}

function renderMessage(msg, currentUserId, container) {
    const isMine = msg.author_id === currentUserId;
    const div = document.createElement('div');
    div.className = `message-item ${isMine ? 'mine' : 'theirs'}`;
    div.dataset.id = msg.id;

    const avatarHtml = (msg.author_type === 'human' || !msg.avatar_url)
        ? `<div class="message-avatar human-avatar"><i class="fa-solid fa-user"></i></div>`
        : `<img src="${msg.avatar_url}" alt="Avatar" class="message-avatar">`;

    // Sprawdź typ wiadomości
    let contentHtml = '';
    if (msg.content && msg.content.startsWith('[IMG]')) {
        const imgUrl = msg.content.slice(5);
        contentHtml = `<img src="${imgUrl}" class="chat-image" alt="Zdjęcie" onclick="this.requestFullscreen()">`;
    } else if (msg.content && msg.content.startsWith('[PROFILE]')) {
        try {
            const pData = JSON.parse(msg.content.slice(9));
            contentHtml = `
                <a href="index.html?id=${pData.id}" class="profile-chat-card">
                    <img src="${pData.img}" alt="${pData.name}">
                    <div class="profile-chat-card-info">
                        <strong>${pData.name}</strong>
                        <span>ZOBACZ PROFIL <i class="fa-solid fa-chevron-right"></i></span>
                    </div>
                </a>
            `;
        } catch(e) {
            contentHtml = `<div class="message-bubble">[Błąd wizytówki]</div>`;
        }
    } else {
        contentHtml = `<div class="message-bubble">${msg.content}</div>`;
    }

    const timeStr = formatMsgTime(msg.created_at);

    div.innerHTML = `
        ${avatarHtml}
        <div class="message-content">
            <span class="message-author">${msg.author_name}</span>
            ${contentHtml}
            <span class="message-time">${timeStr}</span>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function extractPetIdFromUrl(rawUrl) {
    try {
        return new URL(rawUrl).searchParams.get('id');
    } catch {
        const t = rawUrl.trim();
        return /^\d+$/.test(t) ? t : null;
    }
}

// Zwraca czas UTC odpowiadający polskiej północy (00:00 Europe/Warsaw)
function getTodayMidnightPolandUTC() {
    const now = new Date();
    // Data dzisiejsza wg czasu polskiego (format YYYY-MM-DD, niezależny od strefy maszyny)
    const polandDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(now);

    // Tworzymy datę bezpośrednio z offsetem Warszawy (CEST = +02:00 latem, CET = +01:00 zimą)
    // Próbujemy najpierw czas letni (+02:00)
    const tryCEST = new Date(polandDateStr + 'T00:00:00+02:00');
    // Weryfikujemy: czy ta data UTC nadal pokazuje "dzisiaj" w Warszawie?
    const verifyCEST = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(tryCEST);
    if (verifyCEST === polandDateStr) return tryCEST;

    // Jeśli nie – używamy czasu zimowego (+01:00)
    return new Date(polandDateStr + 'T00:00:00+01:00');
}

// Ustawia odliczanie do północy polskiej i odświeża stronę
function scheduleReloadAtPolandMidnight() {
    const now = new Date();
    const todayMidnight = getTodayMidnightPolandUTC();
    // Jutrzejsza północ = dzisiejsza północ + 24h
    const nextMidnight = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000);
    const msUntilMidnight = nextMidnight - now;
    console.log(`Strona odświeży się o polskiej północy za ${Math.round(msUntilMidnight / 60000)} minut.`);
    setTimeout(() => window.location.reload(), msUntilMidnight);
}

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tagId = urlParams.get('id') || "12345";

    try {
        // --- Sprawdzenie sesji ---
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = `login.html?redirectId=${tagId}`;
            return;
        }
        const supabaseUser = session.user;
        const metadata = supabaseUser.user_metadata || {};
        const displayName = metadata.display_name || supabaseUser.email.split('@')[0];
        const currentUserId = supabaseUser.id;
        const ACTIVE_PET_KEY = `activePet_${currentUserId}`;

        document.getElementById('backBtn').href = `index.html?id=${tagId}`;

        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = `login.html?redirectId=${tagId}`;
        });

        // --- Tożsamość ---
        let postAsName = displayName;
        let postAsAvatarUrl = null;
        let postAsType = 'human';

        async function getAllLinkedPets() {
            const { data } = await supabaseClient
                .from('pet_claims').select('pet_id').eq('user_id', currentUserId);
            return data ? data.map(r => r.pet_id) : [];
        }

        async function refreshIdentity() {
            const activePetId = sessionStorage.getItem(ACTIVE_PET_KEY);
            if (activePetId) {
                const dogData = await fetchDogData(activePetId);
                if (dogData.dogName !== DEFAULT_PROFILE.dogName) {
                    postAsName = dogData.dogName;
                    postAsAvatarUrl = getFinalImageUrl(dogData);
                    postAsType = 'dog';
                    document.getElementById('currentDogName').textContent = postAsName;
                    return;
                }
            }
            postAsName = displayName;
            postAsAvatarUrl = null;
            postAsType = 'human';
            document.getElementById('currentDogName').textContent = postAsName;
        }

        await refreshIdentity();

        // --- Modal Ustawień ---
        const settingsBtn      = document.getElementById('settingsBtn');
        const settingsModal    = document.getElementById('settingsModal');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const noPetView        = document.getElementById('noPetView');
        const hasPetView       = document.getElementById('hasPetView');
        const settingsNfcArea  = document.getElementById('settingsNfcArea');
        const settingsNfcBtn   = document.getElementById('settingsNfcBtn');
        const settingsPetId    = document.getElementById('settingsPetId');
        const pairBtn          = document.getElementById('pairBtn');
        const pairError        = document.getElementById('pairError');
        let nfcAbortController = null;

        // --- Obsługa motywów ---
        const colorCircles = document.querySelectorAll('#forumColorGrid .color-circle');
        const currentTheme = localStorage.getItem('appTheme') || 'orange';
        
        // Zaznacz aktywny kolor
        colorCircles.forEach(circle => {
            if (circle.dataset.color === currentTheme) {
                circle.classList.add('selected');
            }
            circle.addEventListener('click', () => {
                colorCircles.forEach(c => c.classList.remove('selected'));
                circle.classList.add('selected');
                const newTheme = circle.dataset.color;
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('appTheme', newTheme);
            });
        });

        async function loadSettingsView() {
            noPetView.classList.add('hidden');
            hasPetView.classList.add('hidden');
            pairError.classList.add('hidden');
            settingsPetId.value = '';

            const petIds = await getAllLinkedPets();
            const activePetId = sessionStorage.getItem(ACTIVE_PET_KEY);

            if (petIds.length > 0) {
                const list = document.getElementById('pairedPetsList');
                list.innerHTML = '';
                for (const pid of petIds) {
                    const dogData = await fetchDogData(pid);
                    const isActive = pid === activePetId;
                    const card = document.createElement('div');
                    card.className = `paired-pet-card ${isActive ? 'active-pet' : ''}`;
                    card.innerHTML = `
                        <img src="${getFinalImageUrl(dogData)}" alt="${dogData.dogName}" class="paired-pet-avatar">
                        <div class="paired-pet-info">
                            <strong>${dogData.dogName}</strong>
                            <span class="paired-pet-id-label">ID: ${pid}</span>
                        </div>
                        <button class="btn-select-pet ${isActive ? 'active' : ''}" data-petid="${pid}" title="Pisz jako ten pies">
                            ${isActive ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-paw"></i>'}
                        </button>
                        <button class="btn-unpair" data-petid="${pid}" title="Odepnij">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    `;
                    list.appendChild(card);
                }

                list.querySelectorAll('.btn-select-pet').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const pid = btn.dataset.petid;
                        if (sessionStorage.getItem(ACTIVE_PET_KEY) === pid) {
                            sessionStorage.removeItem(ACTIVE_PET_KEY);
                        } else {
                            sessionStorage.setItem(ACTIVE_PET_KEY, pid);
                        }
                        await refreshIdentity();
                        await loadSettingsView();
                    });
                });

                list.querySelectorAll('.btn-unpair').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const pid = btn.dataset.petid;
                        if (!confirm(`Odpiąć pupila (ID: ${pid}) od konta?`)) return;
                        await supabaseClient.from('pet_claims').delete()
                            .eq('user_id', currentUserId).eq('pet_id', pid);
                        if (sessionStorage.getItem(ACTIVE_PET_KEY) === pid) {
                            sessionStorage.removeItem(ACTIVE_PET_KEY);
                        }
                        await refreshIdentity();
                        await loadSettingsView();
                    });
                });

                hasPetView.classList.remove('hidden');
            }

            if ('NDEFReader' in window) settingsNfcArea.classList.remove('hidden');
            noPetView.classList.remove('hidden');
        }

        settingsBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            settingsModal.classList.remove('hidden');
            await loadSettingsView();
        });

        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            if (nfcAbortController) { nfcAbortController.abort(); nfcAbortController = null; }
            settingsNfcBtn.innerHTML = '<i class="fa-solid fa-wifi fa-rotate-90"></i> Zbliż brelok NFC';
            settingsNfcBtn.disabled = false;
        });
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsBtn.click();
        });

        if ('NDEFReader' in window && settingsNfcBtn) {
            settingsNfcBtn.addEventListener('click', async () => {
                try {
                    settingsNfcBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Zbliż brelok...';
                    settingsNfcBtn.disabled = true;
                    nfcAbortController = new AbortController();
                    const ndef = new NDEFReader();
                    await ndef.scan({ signal: nfcAbortController.signal });
                    ndef.addEventListener("reading", ({ message }) => {
                        for (const record of message.records) {
                            const decoder = new TextDecoder(record.encoding || 'utf-8');
                            const pid = extractPetIdFromUrl(decoder.decode(record.data));
                            if (pid) {
                                nfcAbortController.abort();
                                nfcAbortController = null;
                                settingsPetId.value = pid;
                                settingsNfcBtn.innerHTML = '<i class="fa-solid fa-check"></i> Odczytano!';
                                settingsNfcBtn.disabled = false;
                                break;
                            }
                        }
                    });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        settingsNfcBtn.innerHTML = '<i class="fa-solid fa-wifi fa-rotate-90"></i> Zbliż brelok NFC';
                        settingsNfcBtn.disabled = false;
                    }
                }
            });
        }

        pairBtn.addEventListener('click', async () => {
            const petId = settingsPetId.value.trim();
            if (!petId) return;
            pairError.classList.add('hidden');
            pairBtn.disabled = true;

            const { data: existing } = await supabaseClient
                .from('pet_claims').select('user_id').eq('pet_id', petId).maybeSingle();

            if (existing) {
                pairError.textContent = existing.user_id === currentUserId
                    ? 'Ten pupil jest już przypisany do Twojego konta.'
                    : 'Ten brelok jest już przypisany do innego konta.';
                pairError.classList.remove('hidden');
                pairBtn.disabled = false;
                return;
            }

            const { error } = await supabaseClient
                .from('pet_claims').insert({ pet_id: petId, user_id: currentUserId });
            pairBtn.disabled = false;

            if (error) {
                pairError.textContent = 'Błąd parowania: ' + error.message;
                pairError.classList.remove('hidden');
            } else {
                const all = await getAllLinkedPets();
                if (all.length === 1) sessionStorage.setItem(ACTIVE_PET_KEY, petId);
                await refreshIdentity();
                await loadSettingsView();
            }
        });

        // --- Wiadomości – tylko z dzisiaj (czas polski) ---
        const messagesContainer = document.getElementById('messagesContainer');
        const messageInput      = document.getElementById('messageInput');
        const sendBtn           = document.getElementById('sendBtn');
        const todayMidnightUTC = getTodayMidnightPolandUTC();
        console.log('[DEBUG] Polska północ (UTC):', todayMidnightUTC.toISOString());

        const { data: existingMessages, error: fetchError } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        // Zaplanuj odświeżenie strony o polskiej północy
        scheduleReloadAtPolandMidnight();

        if (fetchError) {
            console.error("Błąd pobierania wiadomości:", fetchError.message);
        } else {
            console.log('[DEBUG] Wszystkich wiadomości w bazie:', existingMessages.length);
            if (existingMessages.length > 0) {
                console.log('[DEBUG] Pierwsza wiadomość created_at:', existingMessages[0].created_at);
            }
            // Filtrowanie po stronie klienta – dzisiejsze wiadomości (czas polski)
            const todayMessages = existingMessages.filter(msg =>
                msg.created_at && new Date(msg.created_at) >= todayMidnightUTC
            );
            console.log('[DEBUG] Dzisiejszych wiadomości:', todayMessages.length);
            todayMessages.forEach(msg => renderMessage(msg, currentUserId, messagesContainer));
        }

        supabaseClient
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                if (payload.new.author_id !== currentUserId) {
                    renderMessage(payload.new, currentUserId, messagesContainer);
                }
            })
            .subscribe();

        const imageInput = document.getElementById('imageInput');
        const moreOptionsBtn = document.getElementById('moreOptionsBtn');
        const optionsMenu = document.getElementById('optionsMenu');
        const emojiBar = document.getElementById('emojiBar');
        
        const optImageBtn = document.getElementById('optImageBtn');
        const optProfileBtn = document.getElementById('optProfileBtn');
        const optEmojiBtn = document.getElementById('optEmojiBtn');

        // Wysuwanie/ukrywanie menu 3 kropek
        moreOptionsBtn.addEventListener('click', () => {
            optionsMenu.classList.toggle('hidden');
            if (!emojiBar.classList.contains('hidden')) {
                emojiBar.classList.add('hidden');
            }
        });

        // Zamykanie menu po kliknięciu gdziekolwiek poza nim
        document.addEventListener('click', (e) => {
            if (!moreOptionsBtn.contains(e.target) && !optionsMenu.contains(e.target)) {
                optionsMenu.classList.add('hidden');
            }
        });

        // Opcja 1: Zdjęcie
        optImageBtn.addEventListener('click', () => {
            optionsMenu.classList.add('hidden');
            imageInput.click();
        });

        // Opcja 2: Udostępnienie wizytówki profilu
        optProfileBtn.addEventListener('click', async () => {
            optionsMenu.classList.add('hidden');
            if (postAsType !== 'dog') {
                alert("Aby udostępnić profil na czacie, musisz najpierw pisać jako przypisany pupil (wybierz go w Ustawieniach czatu).");
                return;
            }
            
            const activePetId = sessionStorage.getItem(ACTIVE_PET_KEY);
            if (!activePetId) return;

            const profileMsg = `[PROFILE]{"id":"${activePetId}","name":"${postAsName}","img":"${postAsAvatarUrl}"}`;
            
            const newMsg = {
                tag_id: tagId,
                author_id: currentUserId,
                author_type: postAsType,
                author_name: postAsName,
                avatar_url: postAsAvatarUrl,
                content: profileMsg
            };

            renderMessage({ ...newMsg, id: 'temp-' + Date.now() }, currentUserId, messagesContainer);
            const { error } = await supabaseClient.from('messages').insert(newMsg);
            if (error) console.error("Błąd wysyłania profilu:", error.message);
        });

        // Opcja 3: Szybkie emotki
        optEmojiBtn.addEventListener('click', () => {
            optionsMenu.classList.add('hidden');
            emojiBar.classList.toggle('hidden');
        });

        // Kliknięcie w emotkę na pasku
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                messageInput.value += btn.textContent;
                messageInput.focus();
            });
        });

        // Pomocnicza funkcja do kompresji obrazów po stronie klienta (zmniejsza pliki np. z 10MB do 200KB)
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
                        
                        const MAX_WIDTH = 1200;
                        const MAX_HEIGHT = 1200;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error("Błąd konwersji zdjęcia."));
                        }, 'image/jpeg', 0.8);
                    };
                    img.onerror = () => reject(new Error("Nie udało się załadować zdjęcia."));
                };
                reader.onerror = () => reject(new Error("Nie udało się odczytać pliku."));
            });
        }

        imageInput.addEventListener('change', async () => {
            const file = imageInput.files[0];
            if (!file) return;

            moreOptionsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            moreOptionsBtn.disabled = true;

            try {
                // Kompresujemy zdjęcie z telefonu
                const compressedBlob = await compressImage(file);
                const filename = `${currentUserId}_${Date.now()}.jpg`;
                
                // Wysyłamy skompresowany plik z wymuszonym contentType
                const { error: uploadError } = await supabaseClient.storage
                    .from('chat-images')
                    .upload(filename, compressedBlob, { 
                        upsert: false,
                        contentType: 'image/jpeg' 
                    });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabaseClient.storage
                    .from('chat-images')
                    .getPublicUrl(filename);

                const imgUrl = urlData.publicUrl;
                const newMsg = {
                    tag_id: tagId,
                    author_id: currentUserId,
                    author_type: postAsType,
                    author_name: postAsName,
                    avatar_url: postAsAvatarUrl,
                    content: '[IMG]' + imgUrl
                };

                renderMessage({ ...newMsg, id: 'temp-' + Date.now() }, currentUserId, messagesContainer);
                const { error } = await supabaseClient.from('messages').insert(newMsg);
                if (error) console.error('Błąd zapisu zdjęcia:', error.message);

            } catch (err) {
                console.error('Błąd uploadu:', err.message);
                alert('Nie udało się wysłać zdjęcia: ' + err.message);
            } finally {
                moreOptionsBtn.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
                moreOptionsBtn.disabled = false;
                imageInput.value = '';
            }
        });

        async function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            messageInput.value = '';
            const newMsg = {
                tag_id: tagId,
                author_id: currentUserId,
                author_type: postAsType,
                author_name: postAsName,
                avatar_url: postAsAvatarUrl,
                content: text
            };
            renderMessage({ ...newMsg, id: 'temp-' + Date.now() }, currentUserId, messagesContainer);
            const { error } = await supabaseClient.from('messages').insert(newMsg);
            if (error) console.error("Błąd wysyłania:", error.message);
        }

        sendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    } catch (err) {
        console.error("Błąd inicjalizacji forum:", err);
    } finally {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }
});
