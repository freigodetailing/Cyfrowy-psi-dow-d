const SUPABASE_URL = 'https://alncaeqazzasaspmlxsj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbmNhZXFhenphc2FzcG1seHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjMxOTMsImV4cCI6MjA5MzEzOTE5M30.SQ7_xF8UJ_Mue_BDEMP-xfXv-A8jz88VJ-Rljcbvf7c';

let supabaseClient;
let stepCounterActive = false;
let totalDailySteps = 0;
let lastAccelMag = 0;
let smoothMag = 0;
let lastStepTime = 0;
let stepsSinceLastSync = 0;
let walkStartTime = null;
let walkTimerInterval = null;
let lastSyncTimestamp = 0;
let backgroundGeoInterval = null;
let dailyStepGoal = parseInt(localStorage.getItem('dailyStepGoal')) || 10000;

function formatDateLocal(date) {
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function renderActivityChart(petId) {
    console.log("Starting renderActivityChart for:", petId);
    const chart = document.getElementById('activityChart');
    if (!chart) {
        console.error("activityChart element not found!");
        return;
    }
    
    let historyMap = {};
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const dateLimit = formatDateLocal(sevenDaysAgo);
        
        console.log("Fetching history from:", dateLimit);
        const { data: history, error } = await supabaseClient
            .from('pet_activity').select('date, steps').eq('pet_id', petId).gte('date', dateLimit).order('date', { ascending: true });
        
        if (error) throw error;
        if (history) {
            history.forEach(h => historyMap[h.date] = h.steps);
            console.log("History loaded:", history.length, "records");
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
    console.log("Chart innerHTML updated");
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Walk.js v2.6 (Custom Modal) loaded");

    // Inicjalizacja wyświetlania celu i modala
    const goalValElem = document.getElementById('dailyStepGoalVal');
    const goalContainer = document.getElementById('stepGoalContainer');
    const goalModal = document.getElementById('goalModal');
    const goalInput = document.getElementById('goalInput');
    const saveGoalBtn = document.getElementById('saveGoalModal');
    const closeGoalBtn = document.getElementById('closeGoalModal');

    if (goalValElem) goalValElem.textContent = dailyStepGoal.toLocaleString();

    if (goalContainer) {
        goalContainer.onclick = () => {
            if (goalModal) {
                goalInput.value = dailyStepGoal;
                goalModal.classList.remove('hidden');
                setTimeout(() => goalInput.focus(), 100);
            }
        };
    }

    if (closeGoalBtn) {
        closeGoalBtn.onclick = () => goalModal.classList.add('hidden');
    }

    if (saveGoalBtn) {
        saveGoalBtn.onclick = () => {
            const val = parseInt(goalInput.value);
            if (val && val >= 500) {
                dailyStepGoal = val;
                localStorage.setItem('dailyStepGoal', dailyStepGoal);
                if (goalValElem) goalValElem.textContent = dailyStepGoal.toLocaleString();
                const urlParams = new URLSearchParams(window.location.search);
                const currentPetId = urlParams.get('id');
                if (currentPetId) renderActivityChart(parseInt(currentPetId));
                goalModal.classList.add('hidden');
            } else {
                alert("Proszę podać poprawną liczbę kroków (min. 500).");
            }
        };
    }

    // Zamknij modal klikając w tło
    if (goalModal) {
        goalModal.onclick = (e) => {
            if (e.target === goalModal) goalModal.classList.add('hidden');
        };
    }

    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        alert("Błąd ładowania Supabase. Sprawdź internet.");
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('id');
    if (!petId) { window.location.href = 'panel.html'; return; }

    const numericPetId = parseInt(petId);
    let selectedPetIds = [numericPetId];
    let petsStepsData = {};

    try {
        const { data: dog } = await supabaseClient.from('dogs').select('*').eq('ID', numericPetId).single();
        if (dog) {
            document.getElementById('miniPetName').textContent = dog['IMIE PSA'];
            if (dog['ZDJECIE']) {
                let imgUrl = dog['ZDJECIE'];
                if (!imgUrl.startsWith('http') && !imgUrl.startsWith('./')) imgUrl = `./photos/${imgUrl}`;
                document.getElementById('miniPetImg').src = imgUrl;
            }
        }

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { data: partnership } = await supabaseClient.from('account_partnerships').select('user_1, user_2').or(`user_1.eq.${user.id},user_2.eq.${user.id}`).maybeSingle();
            const userIds = [user.id];
            if (partnership) userIds.push(partnership.user_1 === user.id ? partnership.user_2 : partnership.user_1);
            const { data: claims } = await supabaseClient.from('pet_claims').select('pet_id').in('user_id', userIds);
            if (claims && claims.length > 0) {
                const petIds = claims.map(c => parseInt(c.pet_id)).filter(id => id !== numericPetId);
                const { data: otherDogs } = await supabaseClient.from('dogs').select('*').in('ID', petIds);
                if (otherDogs && otherDogs.length > 0) initMultiPetUI(otherDogs);
            }
        }
        await initStepCounter(numericPetId);
    } catch (err) { console.error("Init error:", err); }
    finally {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
        const app = document.getElementById('app');
        if (app) app.classList.remove('hidden');
    }

    function initMultiPetUI(otherDogs) {
        const container = document.getElementById('multiPetSection');
        const list = document.getElementById('otherPetsList');
        if (!container || !list) return;
        container.classList.remove('hidden');
        otherDogs.forEach(pet => {
            const pid = parseInt(pet.ID);
            const chip = document.createElement('div');
            chip.className = 'pet-chip';
            let imgUrl = pet['ZDJECIE'] || './photos/podstawa.png';
            if (!imgUrl.startsWith('http') && !imgUrl.startsWith('./')) imgUrl = `./photos/${imgUrl}`;
            chip.innerHTML = `<img src="${imgUrl}" alt="${pet['IMIE PSA']}"><span>${pet['IMIE PSA']}</span>`;
            chip.onclick = async () => {
                if (stepCounterActive) return;
                if (selectedPetIds.includes(pid)) {
                    selectedPetIds = selectedPetIds.filter(id => id !== pid);
                    chip.classList.remove('selected');
                } else {
                    selectedPetIds.push(pid);
                    chip.classList.add('selected');
                    const todayStr = formatDateLocal(new Date());
                    const { data: activity } = await supabaseClient.from('pet_activity').select('steps').eq('pet_id', pid).eq('date', todayStr).maybeSingle();
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
        if (!toggleBtn) return;

        toggleBtn.onclick = async () => {
            try {
                if (!stepCounterActive) {
                    if ('Notification' in window && Notification.permission !== 'granted') await Notification.requestPermission();
                    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
                        const permission = await DeviceMotionEvent.requestPermission();
                        if (permission !== 'granted') return alert("Brak uprawnień do sensorów.");
                    }
                    startWalk();
                } else { stopWalk(); }
            } catch (err) { alert("Błąd: " + err.message); }
        };

        const todayStr = formatDateLocal(new Date());
        const { data: activity } = await supabaseClient.from('pet_activity').select('steps').eq('pet_id', mainPid).eq('date', todayStr).maybeSingle();
        petsStepsData[mainPid] = activity ? activity.steps : 0;
        totalDailySteps = petsStepsData[mainPid];
        if (stepDisplay) stepDisplay.textContent = `${totalDailySteps} kroków`;

        // Render chart with a slight delay
        setTimeout(() => renderActivityChart(mainPid), 300);

        let wakeLock = null;
        let silentAudio = null;
        function initSilentAudio() {
            const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFav7//v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+";
            silentAudio = new Audio(silentSrc);
            silentAudio.loop = true;
        }
        initSilentAudio();

        async function requestWakeLock() {
            try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
            if (silentAudio) silentAudio.play().catch(() => {});
            if ("geolocation" in navigator) backgroundGeoInterval = navigator.geolocation.watchPosition(() => {}, () => {}, { enableHighAccuracy: true, maximumAge: 0 });
        }
        function releaseWakeLock() {
            if (wakeLock) { wakeLock.release(); wakeLock = null; }
            if (silentAudio) silentAudio.pause();
            if (backgroundGeoInterval !== null) { navigator.geolocation.clearWatch(backgroundGeoInterval); backgroundGeoInterval = null; }
        }

        function startWalk() {
            stepCounterActive = true;
            walkStartTime = Date.now();
            lastSyncTimestamp = Date.now();
            stepsSinceLastSync = 0;
            lastStepTime = 0;
            smoothMag = 0;
            lastAccelMag = 0;
            toggleBtn.innerHTML = '<i class="fa-solid fa-stop"></i> Zatrzymaj';
            toggleBtn.classList.add('btn-walk-stop');
            statusText.textContent = 'Spacerujemy razem!';
            durationText.classList.remove('hidden');
            walkTimerInterval = setInterval(() => {
                const diff = Date.now() - walkStartTime;
                const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
                const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
                durationText.textContent = `${h}:${m}:${s}`;
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'SHOW_WALK_NOTIFICATION', steps: totalDailySteps, duration: durationText.textContent, petName: document.getElementById('miniPetName').textContent });
                }
                if (Date.now() - lastSyncTimestamp > 30000 && stepsSinceLastSync > 0) performPeriodicSync();
                if (Date.now() % 10000 < 1000 && "vibrate" in navigator) navigator.vibrate(1);
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
            if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_WALK_NOTIFICATION' });
            for (const pid of selectedPetIds) await syncStepsToSupabase(pid, petsStepsData[pid]);
            renderActivityChart(mainPid);
            document.getElementById('multiPetSection').style.opacity = '1';
            document.getElementById('multiPetSection').style.pointerEvents = 'auto';
            setTimeout(() => { statusText.textContent = 'Gotowy na kolejny spacer?'; durationText.classList.add('hidden'); }, 3000);
        }

        async function performPeriodicSync() {
            lastSyncTimestamp = Date.now();
            stepsSinceLastSync = 0;
            for (const pid of selectedPetIds) await syncStepsToSupabase(pid, petsStepsData[pid]);
        }

        function handleMotion(event) {
            const acc = event.accelerationIncludingGravity;
            if (!acc) return;
            const rawMag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
            smoothMag = (smoothMag * 0.7) + (rawMag * 0.3);
            const threshold = 11.8;
            const now = Date.now();
            if (smoothMag > threshold && lastAccelMag <= threshold && (now - lastStepTime) > 330) {
                lastStepTime = now;
                stepsSinceLastSync++;
                selectedPetIds.forEach(pid => { petsStepsData[pid] = (petsStepsData[pid] || 0) + 1; });
                totalDailySteps = petsStepsData[mainPid];
                stepDisplay.textContent = `${totalDailySteps} kroków`;
                if ("vibrate" in navigator) navigator.vibrate(24);
                if (stepsSinceLastSync >= 50) performPeriodicSync();
            }
            lastAccelMag = smoothMag;
        }
    }
});

async function syncStepsToSupabase(petId, steps) {
    try {
        const todayStr = formatDateLocal(new Date());
        await supabaseClient.from('pet_activity').upsert({ pet_id: petId, date: todayStr, steps: steps }, { onConflict: 'pet_id,date' });
    } catch (e) { console.error(e); }
}
