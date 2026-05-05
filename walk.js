// --- Konfiguracja Supabase ---
const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let stepCounterActive = false;
let totalDailySteps = 0;
let lastAccelMag = 0;
let walkStartTime = null;
let walkTimerInterval = null;

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('id');
    
    if (!petId) {
        window.location.href = 'panel.html';
        return;
    }

    const numericPetId = parseInt(petId);
    let selectedPetIds = [numericPetId];
    let petsStepsData = {}; // { [id]: dailyTotal }

    try {
        // 1. Pobranie danych głównego psa
        const { data: dog } = await supabaseClient
            .from('dogs')
            .select('*')
            .eq('ID', numericPetId)
            .single();

        if (dog) {
            document.getElementById('miniPetName').textContent = dog['IMIE PSA'];
            if (dog['ZDJECIE']) {
                let imgUrl = dog['ZDJECIE'];
                if (!imgUrl.startsWith('http') && !imgUrl.startsWith('./')) imgUrl = `./photos/${imgUrl}`;
                document.getElementById('miniPetImg').src = imgUrl;
            }
        }

        // 2. Pobranie innych psów użytkownika i partnera
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            // Sprawdź partnerstwo
            const { data: partnership } = await supabaseClient
                .from('account_partnerships')
                .select('user_1, user_2')
                .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
                .maybeSingle();
            
            const userIds = [user.id];
            if (partnership) {
                userIds.push(partnership.user_1 === user.id ? partnership.user_2 : partnership.user_1);
            }

            const { data: claims } = await supabaseClient
                .from('pet_claims')
                .select('pet_id')
                .in('user_id', userIds);
            
            if (claims && claims.length > 0) {
                const petIds = claims.map(c => parseInt(c.pet_id)).filter(id => id !== numericPetId);
                
                const { data: otherDogs } = await supabaseClient
                    .from('dogs')
                    .select('*')
                    .in('ID', petIds);

                if (otherDogs && otherDogs.length > 0) {
                    initMultiPetUI(otherDogs);
                }
            }
        }

        // 3. Inicjalizacja licznika
        await initStepCounter(numericPetId);

    } catch (err) {
        console.error(err);
    } finally {
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
    }

    function initMultiPetUI(otherDogs) {
        const container = document.getElementById('multiPetSection');
        const list = document.getElementById('otherPetsList');
        container.classList.remove('hidden');
        
        otherDogs.forEach(pet => {
            const pid = parseInt(pet.ID);
            
            const chip = document.createElement('div');
            chip.className = 'pet-chip';
            
            let imgUrl = pet['ZDJECIE'] || './photos/podstawa.png';
            if (!imgUrl.startsWith('http') && !imgUrl.startsWith('./')) imgUrl = `./photos/${imgUrl}`;
            
            chip.innerHTML = `
                <img src="${imgUrl}" alt="${pet['IMIE PSA']}">
                <span>${pet['IMIE PSA']}</span>
            `;
            
            chip.onclick = async () => {
                if (stepCounterActive) return; // Nie zmieniamy w trakcie spaceru
                
                if (selectedPetIds.includes(pid)) {
                    selectedPetIds = selectedPetIds.filter(id => id !== pid);
                    chip.classList.remove('selected');
                } else {
                    selectedPetIds.push(pid);
                    chip.classList.add('selected');
                    // Pobierz dzisiejsze kroki dla tego psa
                    const todayStr = new Date().toISOString().split('T')[0];
                    const { data: activity } = await supabaseClient
                        .from('pet_activity')
                        .select('steps')
                        .eq('pet_id', pid)
                        .eq('date', todayStr)
                        .maybeSingle();
                    petsStepsData[pid] = activity ? activity.steps : 0;
                }
            };
            list.appendChild(chip);
        });
    }

    async function initStepCounter(mainPid) {
        const toggleBtn = document.getElementById('toggleWalkBtn');
        const statusText = document.getElementById('walkStatus');
        const durationText = document.getElementById('walkDuration');
        const stepDisplay = document.getElementById('stepCountDisplay');
        
        // Pobranie kroków głównego psa
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: activity } = await supabaseClient
            .from('pet_activity')
            .select('steps')
            .eq('pet_id', mainPid)
            .eq('date', todayStr)
            .maybeSingle();
        
        petsStepsData[mainPid] = activity ? activity.steps : 0;
        totalDailySteps = petsStepsData[mainPid];
        stepDisplay.textContent = `${totalDailySteps} kroków`;

        renderActivityChart(mainPid);

        let wakeLock = null;

        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) { console.warn('Wake Lock error:', err); }
        }

        function releaseWakeLock() {
            if (wakeLock) {
                wakeLock.release();
                wakeLock = null;
            }
        }

        async function updateNotification() {
            if (!stepCounterActive) return;
            const durationTextVal = durationText.textContent;
            const mainPetName = document.getElementById('miniPetName').textContent;
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SHOW_WALK_NOTIFICATION',
                    steps: totalDailySteps,
                    duration: durationTextVal,
                    petName: mainPetName
                });
            }
        }

        // Nasłuchiwanie na sygnał ZATRZYMAJ z powiadomienia
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data.type === 'STOP_WALK' && stepCounterActive) stopWalk();
            });
        }

        toggleBtn.onclick = async () => {
            if (!stepCounterActive) {
                if ('Notification' in window && Notification.permission !== 'granted') {
                    await Notification.requestPermission();
                }
                if (typeof DeviceMotionEvent.requestPermission === 'function') {
                    try {
                        const permission = await DeviceMotionEvent.requestPermission();
                        if (permission !== 'granted') return;
                    } catch (e) { console.error(e); }
                }
                startWalk();
            } else {
                stopWalk();
            }
        };

        function startWalk() {
            stepCounterActive = true;
            walkStartTime = Date.now();
            toggleBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Zatrzymaj';
            toggleBtn.classList.add('btn-walk-stop');
            statusText.textContent = 'Spacerujemy razem!';
            durationText.classList.remove('hidden');
            walkTimerInterval = setInterval(() => {
                updateWalkDuration();
                updateNotification();
            }, 1000);
            window.addEventListener('devicemotion', handleMotion);
            requestWakeLock();
            document.getElementById('multiPetSection').style.opacity = '0.5';
            document.getElementById('multiPetSection').style.pointerEvents = 'none';
        }

        async function stopWalk() {
            stepCounterActive = false;
            window.removeEventListener('devicemotion', handleMotion);
            clearInterval(walkTimerInterval);
            toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Włącz Spacer';
            toggleBtn.classList.remove('btn-walk-stop');
            statusText.textContent = 'Spacer zakończony!';
            releaseWakeLock();
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_WALK_NOTIFICATION' });
            }
            for (const pid of selectedPetIds) {
                await syncStepsToSupabase(pid, petsStepsData[pid]);
            }
            renderActivityChart(mainPid);
            document.getElementById('multiPetSection').style.opacity = '1';
            document.getElementById('multiPetSection').style.pointerEvents = 'auto';
            setTimeout(() => {
                statusText.textContent = 'Gotowy na kolejny spacer?';
                durationText.classList.add('hidden');
            }, 3000);
        }

        function handleMotion(event) {
            const acc = event.accelerationIncludingGravity;
            if (!acc) return;
            const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
            const threshold = 12.5; 
            if (mag > threshold && lastAccelMag <= threshold) {
                // Dodajemy krok wszystkim aktywnym psom
                selectedPetIds.forEach(pid => {
                    petsStepsData[pid] = (petsStepsData[pid] || 0) + 1;
                });
                
                totalDailySteps = petsStepsData[mainPid];
                stepDisplay.textContent = `${totalDailySteps} kroków`;
                if ("vibrate" in navigator) navigator.vibrate(20);
            }
            lastAccelMag = mag;
        }

        function updateWalkDuration() {
            const diff = Date.now() - walkStartTime;
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            durationText.textContent = `${h}:${m}:${s}`;
        }
    }
});

async function syncStepsToSupabase(petId, steps) {
    const todayStr = new Date().toISOString().split('T')[0];
    await supabaseClient.from('pet_activity').upsert({ pet_id: petId, date: todayStr, steps: steps }, { onConflict: 'pet_id,date' });
}

async function renderActivityChart(petId) {
    const chart = document.getElementById('activityChart');
    if (!chart) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const dateLimit = sevenDaysAgo.toISOString().split('T')[0];

    const { data: history } = await supabaseClient
        .from('pet_activity')
        .select('date, steps')
        .eq('pet_id', petId)
        .gte('date', dateLimit)
        .order('date', { ascending: true });

    const historyMap = {};
    if (history) history.forEach(h => historyMap[h.date] = h.steps);

    chart.innerHTML = '';
    const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        const steps = historyMap[dStr] || 0;
        const height = Math.min(Math.max((steps / 10000) * 100, 5), 100);
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-bar-wrapper';
        wrapper.innerHTML = `
            <span class="chart-value">${steps > 0 ? steps : ''}</span>
            <div class="chart-bar ${i === 6 ? 'current' : ''}" style="height: ${height}%" title="${steps} kroków"></div>
            <span class="chart-day">${dayName}</span>
        `;
        chart.appendChild(wrapper);
    }
}
