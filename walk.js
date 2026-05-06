const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';

let supabaseClient;
let stepCounterActive = false;
let totalDailySteps = 0;
let totalWalkDistance = 0; // W metrach
let lastPos = null;
let walkWatchId = null;
let stepsSinceLastSync = 0;
let walkStartTime = null;
let walkTimerInterval = null;
let lastSyncTimestamp = 0;
let dailyStepGoal = parseInt(localStorage.getItem('dailyStepGoal')) || 10000;

function formatDateLocal(date) {
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Matematyczne obliczanie dystansu (Haversine Formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Promień Ziemi w metrach
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Dystans w metrach
}

async function renderActivityChart(petId) {
    const chart = document.getElementById('activityChart');
    if (!chart) return;
    
    let historyMap = {};
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const dateLimit = formatDateLocal(sevenDaysAgo);
        
        const { data: history, error } = await supabaseClient
            .from('pet_activity').select('date, steps').eq('pet_id', petId).gte('date', dateLimit).order('date', { ascending: true });
        
        if (error) throw error;
        if (history) {
            history.forEach(h => historyMap[h.date] = h.steps);
        }
    } catch (e) {
        console.error("Error loading chart history:", e);
    }

    let html = '';
    const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        const dStr = formatDateLocal(d);
        const dayName = days[d.getDay()];
        const steps = historyMap[dStr] || 0;
        const validSteps = (typeof steps === 'number' && !isNaN(steps)) ? steps : 0;
        const height = Math.min(Math.max((validSteps / dailyStepGoal) * 100, 5), 100);
        
        html += `
            <div class="chart-bar-wrapper">
                <span class="chart-value">${validSteps > 0 ? validSteps : ''}</span>
                <div class="chart-bar ${i === 6 ? 'current' : ''}" style="height: ${height}%" title="${validSteps} kroków"></div>
                <span class="chart-day">${dayName}</span>
            </div>
        `;
    }
    chart.innerHTML = html;
}

const TIPS = [
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

document.addEventListener("DOMContentLoaded", async () => {
    // Losowanie wskazówki
    const dailyTip = document.getElementById('dailyTip');
    if (dailyTip) {
        dailyTip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    }
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        alert("Błąd połączenia z bazą.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('id');
    if (!petId) { window.location.href = 'panel.html'; return; }

    const numericPetId = parseInt(petId);
    let selectedPetIds = [numericPetId];
    let petsStepsData = {};

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        console.log("Logged user:", user ? user.email : "none");

        // Fetch main pet
        const { data: dog } = await supabaseClient.from('dogs').select('*').eq('ID', numericPetId).single();
        if (dog) {
            document.getElementById('miniPetName').textContent = dog['IMIE PSA'];
            if (dog['ZDJECIE']) {
                let imgUrl = dog['ZDJECIE'];
                if (!imgUrl.startsWith('http') && !imgUrl.startsWith('./')) imgUrl = `./photos/${imgUrl}`;
                document.getElementById('miniPetImg').src = imgUrl;
            }
        }

        // Renderuj wykres od razu przy starcie
        renderActivityChart(numericPetId);

        // Fetch other pets of the user to allow multi-pet walk
        if (user) {
            // 1. Check for partnership (like in panel.js)
            const { data: partnership } = await supabaseClient
                .from('account_partnerships')
                .select('*')
                .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
                .maybeSingle();

            const userIds = [user.id];
            if (partnership) {
                const partnerId = partnership.user_1 === user.id ? partnership.user_2 : partnership.user_1;
                userIds.push(partnerId);
            }

            // 2. Fetch all pet claims for these users
            const { data: claims } = await supabaseClient
                .from('pet_claims')
                .select('pet_id')
                .in('user_id', userIds);

            console.log("Found claims:", claims ? claims.length : 0);

            if (claims && claims.length > 0) {
                // Filter out current pet and ensure unique IDs
                const petIds = [...new Set(claims.map(c => parseInt(c.pet_id)))].filter(id => id !== numericPetId);
                console.log("Other unique pet IDs to fetch:", petIds);
                
                if (petIds.length > 0) {
                    const { data: otherPets } = await supabaseClient
                        .from('dogs')
                        .select('*')
                        .in('ID', petIds);
                    
                    console.log("Fetched other pets count:", otherPets ? otherPets.length : 0);

                    if (otherPets && otherPets.length > 0) {
                        const multiPetSection = document.getElementById('multiPetSection');
                        const otherPetsList = document.getElementById('otherPetsList');
                        if (multiPetSection) multiPetSection.classList.remove('hidden');
                        
                        if (otherPetsList) {
                            otherPetsList.innerHTML = '';
                            otherPets.forEach(p => {
                                const chip = document.createElement('div');
                                chip.className = 'pet-chip';
                                chip.dataset.id = p.ID;
                                
                                let pImg = p['ZDJECIE'] || './photos/podstawa.png';
                                if (!pImg.startsWith('http') && !pImg.startsWith('./')) pImg = `./photos/${pImg}`;
                                
                                chip.innerHTML = `
                                    <img src="${pImg}" alt="${p['IMIE PSA']}">
                                    <span>${p['IMIE PSA']}</span>
                                `;
                                
                                chip.onclick = async () => {
                                    if (stepCounterActive) return;
                                    const pid = parseInt(p.ID);
                                    if (selectedPetIds.includes(pid)) {
                                        selectedPetIds = selectedPetIds.filter(id => id !== pid);
                                        chip.classList.remove('selected');
                                    } else {
                                        selectedPetIds.push(pid);
                                        chip.classList.add('selected');
                                        const todayStr = formatDateLocal(new Date());
                                        const { data: act } = await supabaseClient.from('pet_activity').select('steps').eq('pet_id', pid).eq('date', todayStr).maybeSingle();
                                        petsStepsData[pid] = act ? act.steps : 0;
                                    }
                                };
                                otherPetsList.appendChild(chip);
                            });
                        }
                    }
                }
            }
        }

        await initGPSCounter(numericPetId);
    } catch (err) { 
        console.error("Init error:", err); 
    } finally {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
        const app = document.getElementById('app');
        if (app) app.classList.remove('hidden');
    }

    async function initGPSCounter(mainPid) {
        const toggleBtn = document.getElementById('toggleWalkBtn');
        const statusText = document.getElementById('walkStatus');
        const durationText = document.getElementById('walkDuration');
        const stepDisplay = document.getElementById('stepCountDisplay');
        if (!toggleBtn) return;

        const todayStr = formatDateLocal(new Date());
        const { data: activity } = await supabaseClient.from('pet_activity').select('steps').eq('pet_id', mainPid).eq('date', todayStr).maybeSingle();
        petsStepsData[mainPid] = activity ? activity.steps : 0;
        totalDailySteps = petsStepsData[mainPid];
        if (stepDisplay) stepDisplay.textContent = `${totalDailySteps} kroków`;

        toggleBtn.onclick = () => {
            if (!stepCounterActive) {
                startWalk();
            } else {
                stopWalk();
            }
        };

        function startWalk() {
            if (!("geolocation" in navigator)) {
                alert("Twój telefon nie wspiera geolokalizacji!");
                return;
            }

            stepCounterActive = true;
            walkStartTime = Date.now();
            lastSyncTimestamp = Date.now();
            totalWalkDistance = 0;
            lastPos = null;
            
            toggleBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Zatrzymaj';
            toggleBtn.classList.add('btn-walk-stop');
            statusText.textContent = 'Spacerujemy razem! (GPS)';
            durationText.classList.remove('hidden');

            // Uruchomienie śledzenia GPS
            walkWatchId = navigator.geolocation.watchPosition((position) => {
                const { latitude, longitude, accuracy } = position.coords;

                // Filtr dokładności (odrzucamy powyżej 20m)
                if (accuracy > 20) return;

                if (lastPos) {
                    const dist = calculateDistance(lastPos.lat, lastPos.lng, latitude, longitude);
                    
                    // Filtr GPS Drift (ruch musi być większy niż 2 metry)
                    if (dist > 2) {
                        totalWalkDistance += dist;
                        
                        // Przeliczanie metrów na kroki (1 krok = 0.75m)
                        const newStepsFromWalk = Math.floor(totalWalkDistance / 0.75);
                        
                        // Aktualizacja dla wszystkich wybranych pupili
                        selectedPetIds.forEach(pid => {
                            const baseSteps = petsStepsData[pid] || 0;
                            // Ważne: obliczamy nową sumę kroków całkowitych
                            const totalWithWalk = baseSteps + newStepsFromWalk;
                            
                            // Synchronizujemy wyświetlanie dla głównego pupila
                            if (pid === mainPid) {
                                totalDailySteps = totalWithWalk;
                                stepDisplay.textContent = `${totalDailySteps} kroków`;
                            }
                        });

                        if ("vibrate" in navigator) navigator.vibrate(20);
                    }
                }
                lastPos = { lat: latitude, lng: longitude };
            }, 
            (err) => {
                console.warn("GPS Error:", err);
            }, 
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });

            // Timer wizualny
            walkTimerInterval = setInterval(() => {
                const diff = Date.now() - walkStartTime;
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                durationText.textContent = `${h}:${m}:${s}`;
                
                // Automatyczna synchronizacja z bazą co 30 sekund
                if (Date.now() - lastSyncTimestamp > 30000) {
                    performSync();
                }
            }, 1000);
        }

        async function stopWalk() {
            stepCounterActive = false;
            
            if (walkWatchId !== null) {
                navigator.geolocation.clearWatch(walkWatchId);
                walkWatchId = null;
            }
            
            clearInterval(walkTimerInterval);
            toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Włącz Spacer';
            toggleBtn.classList.remove('btn-walk-stop');
            statusText.textContent = 'Spacer zakończony!';
            
            // Finalna synchronizacja i aktualizacja bazy
            await performSync();
            
            // Zapamiętanie kroków jako bazowych dla następnego spaceru tego samego dnia
            const newStepsAdded = Math.floor(totalWalkDistance / 0.75);
            selectedPetIds.forEach(pid => {
                petsStepsData[pid] = (petsStepsData[pid] || 0) + newStepsAdded;
            });

            renderActivityChart(mainPid);
            setTimeout(() => { 
                statusText.textContent = 'Gotowy na kolejny spacer?'; 
                durationText.classList.add('hidden'); 
            }, 3000);
        }

        async function performSync() {
            lastSyncTimestamp = Date.now();
            const newSteps = Math.floor(totalWalkDistance / 0.75);
            
            for (const pid of selectedPetIds) {
                const totalToSave = (petsStepsData[pid] || 0) + newSteps;
                try {
                    const todayStr = formatDateLocal(new Date());
                    await supabaseClient.from('pet_activity').upsert({ 
                        pet_id: pid, 
                        date: todayStr, 
                        steps: totalToSave 
                    }, { onConflict: 'pet_id,date' });
                } catch (e) { console.error("Sync error:", e); }
            }
        }
        // --- Logika Modala Celu Dziennego ---
        const goalModal = document.getElementById('goalModal');
        const stepGoalContainer = document.getElementById('stepGoalContainer');
        const closeGoalModal = document.getElementById('closeGoalModal');
        const saveGoalModal = document.getElementById('saveGoalModal');
        const goalInput = document.getElementById('goalInput');
        const dailyStepGoalVal = document.getElementById('dailyStepGoalVal');

        if (stepGoalContainer) {
            if (dailyStepGoalVal) dailyStepGoalVal.textContent = dailyStepGoal.toLocaleString();
            
            stepGoalContainer.onclick = () => {
                if (goalInput) goalInput.value = dailyStepGoal;
                if (goalModal) goalModal.classList.remove('hidden');
            };
        }

        if (closeGoalModal) {
            closeGoalModal.onclick = () => goalModal.classList.add('hidden');
        }

        if (saveGoalModal) {
            saveGoalModal.onclick = () => {
                const newGoal = parseInt(goalInput.value);
                if (newGoal && newGoal >= 500) {
                    dailyStepGoal = newGoal;
                    localStorage.setItem('dailyStepGoal', dailyStepGoal);
                    if (dailyStepGoalVal) dailyStepGoalVal.textContent = dailyStepGoal.toLocaleString();
                    goalModal.classList.add('hidden');
                    renderActivityChart(mainPid); // Odśwież wykres z nową skalą
                } else {
                    alert("Wprowadź poprawny cel (min. 500 kroków)");
                }
            };
        }
        // ------------------------------------
    }
});
