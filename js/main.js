/* ============================================
   DuckSheep - Virtual Pet Game Engine
   ============================================ */

// ===== DOM Elements =====
const petEmoji = document.getElementById('pet-emoji');
const petCharacter = document.getElementById('pet-character');
const petMood = document.getElementById('pet-mood');
const petSpeech = document.getElementById('pet-speech');
const petAura = document.getElementById('pet-aura');
const statHunger = document.getElementById('stat-hunger');
const statHappy = document.getElementById('stat-happy');
const statEnergy = document.getElementById('stat-energy');
const statClean = document.getElementById('stat-clean');
const valHunger = document.getElementById('val-hunger');
const valHappy = document.getElementById('val-happy');
const valEnergy = document.getElementById('val-energy');
const valClean = document.getElementById('val-clean');
const stageBadge = document.getElementById('stage-badge');
const ageBadge = document.getElementById('age-badge');
const totalBadge = document.getElementById('total-badge');
const particlesContainer = document.getElementById('particles');
const achievementList = document.getElementById('achievement-list');

// ===== Sound Engine (Web Audio API) =====
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, type, duration, vol = 0.1) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function sfxFeed() { playTone(523, 'sine', 0.15); setTimeout(() => playTone(659, 'sine', 0.15), 100); }
function sfxPlay() { playTone(440, 'square', 0.1); setTimeout(() => playTone(554, 'square', 0.1), 80); setTimeout(() => playTone(659, 'square', 0.1), 160); }
function sfxClean() { playTone(880, 'sine', 0.3, 0.05); }
function sfxSleep() { playTone(220, 'triangle', 0.5, 0.08); setTimeout(() => playTone(196, 'triangle', 0.5, 0.08), 300); }
function sfxEvolve() { playTone(523, 'sine', 0.2); setTimeout(() => playTone(659, 'sine', 0.2), 150); setTimeout(() => playTone(784, 'sine', 0.3), 300); }
function sfxAchievement() { playTone(784, 'sine', 0.15); setTimeout(() => playTone(988, 'sine', 0.15), 100); setTimeout(() => playTone(1175, 'sine', 0.25), 200); }

// ===== Pet State =====
const EVOLUTION_STAGES = {
    egg:    { emoji: '🥚', name: '孵化中', minAge: 0,    mood: '🤔 等待孵化...' },
    baby:   { emoji: '🐣', name: '宝宝期', minAge: 3,    mood: '👶 我是宝宝！' },
    growing:{ emoji: '🐥', name: '成长期', minAge: 15,   mood: '🌱 正在长大！' },
    adult:  { emoji: '🦆', name: '成熟期', minAge: 40,   mood: '😎 我长大了！' },
    master: { emoji: '🦚', name: '完全体', minAge: 120,  mood: '👑 我是王者！' },
};

const ACHIEVEMENTS = [
    { id: 'first_feed',    icon: '🍞', name: '初次喂食',    desc: '第一次喂食 DuckSheep', condition: (s) => s.totalActions >= 1 },
    { id: 'first_play',    icon: '⚽', name: '初次玩耍',    desc: '第一次和 DuckSheep 玩耍', condition: (s) => s.totalActions >= 2 },
    { id: 'clean_pet',     icon: '✨', name: '爱干净',      desc: '给 DuckSheep 清洁一次', condition: (s) => s.totalActions >= 3 },
    { id: 'good_sleep',    icon: '💤', name: '好梦',        desc: '让 DuckSheep 睡一觉', condition: (s) => s.totalActions >= 4 },
    { id: 'ten_actions',   icon: '🔟', name: '10次互动',    desc: '完成 10 次互动', condition: (s) => s.totalActions >= 10 },
    { id: 'baby_grown',    icon: '🐣', name: '孵化成功',    desc: 'DuckSheep 成功孵化', condition: (s) => s.age >= 3 },
    { id: 'adult_reach',   icon: '🦆', name: '长大成人',    desc: 'DuckSheep 进入成熟期', condition: (s) => s.age >= 40 },
    { id: 'master_reach',  icon: '🦚', name: '完全体',      desc: 'DuckSheep 达到完全体', condition: (s) => s.age >= 120 },
    { id: 'fifty_actions', icon: '💯', name: '50次互动',    desc: '完成 50 次互动', condition: (s) => s.totalActions >= 50 },
    { id: 'perfect_stats', icon: '🌟', name: '满分状态',    desc: '所有属性达到 90% 以上', condition: (s) => s.hunger >= 90 && s.happy >= 90 && s.energy >= 90 && s.clean >= 90 },
    { id: 'full_day',      icon: '📅', name: '一天陪伴',    desc: '累计陪伴 24 小时', condition: (s) => s.age >= 1440 },
    { id: 'quick_react',   icon: '⚡', name: '快速反应',    desc: '1 分钟内完成 5 次互动', condition: (s) => s.totalActions >= 5 },
];

const defaultState = {
    hunger: 100,
    happy: 100,
    energy: 100,
    clean: 100,
    age: 0,           // minutes
    totalActions: 0,
    lastTick: Date.now(),
    isSleeping: false,
    sleepStart: null,
    achievements: [],
    unlockedAchievements: [],
};

let state = { ...defaultState };
let speechTimeout = null;
let tickInterval = null;
let actionCooldowns = {};

// ===== Persistence =====
function saveState() {
    state.lastTick = Date.now();
    localStorage.setItem('ducksheep_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('ducksheep_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
            const elapsed = (Date.now() - state.lastTick) / 1000 / 60; // minutes
            if (elapsed > 0 && !state.isSleeping) {
                applyTimeDecay(elapsed);
            }
            if (state.isSleeping) {
                const sleepElapsed = (Date.now() - state.sleepStart) / 1000 / 60;
                state.energy = Math.min(100, state.energy + sleepElapsed * 3);
                state.age += sleepElapsed;
            }
        } catch (e) {
            state = { ...defaultState };
        }
    }
}

function applyTimeDecay(minutes) {
    state.hunger = Math.max(0, state.hunger - minutes * 0.8);
    state.happy = Math.max(0, state.happy - minutes * 0.5);
    state.energy = Math.max(0, state.energy - minutes * 0.3);
    state.clean = Math.max(0, state.clean - minutes * 0.4);
    state.age += minutes;
}

// ===== Evolution =====
function getCurrentStage() {
    const stages = Object.values(EVOLUTION_STAGES).reverse();
    for (const stage of stages) {
        if (state.age >= stage.minAge) return stage;
    }
    return EVOLUTION_STAGES.egg;
}

// ===== Mood =====
function getMood() {
    const avg = (state.hunger + state.happy + state.energy + state.clean) / 4;
    if (state.isSleeping) return '😴 睡觉中...';
    if (avg >= 90) return '😆 超开心！';
    if (avg >= 70) return '😊 很开心';
    if (avg >= 50) return '😐 一般般';
    if (avg >= 30) return '😟 不太舒服';
    if (avg >= 10) return '😢 好难受...';
    return '💀 快不行了...';
}

// ===== Speech =====
const speeches = {
    feed: ['好吃好吃！🍞', '再来一点！', '嘎嘎，美味！', '咩～谢谢！', '吃饱了！'],
    play: ['好开心！', '再来再来！', '嘎嘎嘎～', '咩咩咩！', '太好玩了！'],
    clean: ['好干净！✨', '闪闪发光！', '舒服多了！', '谢谢你！'],
    sleep: ['晚安...💤', '呼噜...呼噜...', 'Zzz...', '做个好梦！'],
    idle: ['好无聊哦...', '陪我玩嘛～', '嘎？', '咩～', '你在干嘛？'],
    hungry: ['好饿...', '有没有吃的？', '肚子咕咕叫...'],
    dirty: ['好脏啊...', '想洗澡...', '帮我洗洗吧～'],
    tired: ['好累...', '想睡觉...', '没力气了...'],
    evolve: ['我进化了！', '变强了！', '新的我！'],
};

function speak(category) {
    const msgs = speeches[category] || speeches.idle;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    petSpeech.textContent = msg;
    petSpeech.classList.add('show');
    if (speechTimeout) clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => {
        petSpeech.classList.remove('show');
    }, 2500);
}

// ===== Particles =====
function spawnParticles(emoji, count = 8) {
    const rect = petCharacter.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const particles = ['✨', '💫', '🌟', '💖', emoji, '🎉', '💕', '⭐'];

    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.textContent = particles[Math.floor(Math.random() * particles.length)];
        p.style.left = (cx + (Math.random() - 0.5) * 120) + 'px';
        p.style.top = (cy + (Math.random() - 0.5) * 60) + 'px';
        p.style.animationDuration = (1 + Math.random() * 1.5) + 's';
        p.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
        particlesContainer.appendChild(p);
        setTimeout(() => p.remove(), 2000);
    }
}

// ===== Achievements =====
function checkAchievements() {
    let newUnlock = false;
    for (const ach of ACHIEVEMENTS) {
        if (!state.achievements.includes(ach.id) && ach.condition(state)) {
            state.achievements.push(ach.id);
            newUnlock = true;
            showAchievementToast(ach);
        }
    }
    if (newUnlock) saveState();
    renderAchievements();
}

function showAchievementToast(ach) {
    sfxAchievement();
    const toast = document.createElement('div');
    toast.style.cssText = 
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #ffd700, #ffb300);
        padding: 12px 24px; border-radius: 30px;
        font-weight: 700; color: #5d4037; font-size: 1rem;
        z-index: 1000; box-shadow: 0 8px 30px rgba(255, 179, 0, 0.4);
        animation: toastIn 0.5s ease, toastOut 0.5s ease 2.5s forwards;
    ;
    toast.textContent = ${ach.icon} 成就解锁: ;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

function renderAchievements() {
    achievementList.innerHTML = ACHIEVEMENTS.map(ach => {
        const unlocked = state.achievements.includes(ach.id);
        return <span class="achievement-badge" title="">
             
        </span>;
    }).join('');
}

// ===== Render =====
function renderStats() {
    statHunger.style.width = state.hunger + '%';
    statHappy.style.width = state.happy + '%';
    statEnergy.style.width = state.energy + '%';
    statClean.style.width = state.clean + '%';
    valHunger.textContent = Math.round(state.hunger) + '%';
    valHappy.textContent = Math.round(state.happy) + '%';
    valEnergy.textContent = Math.round(state.energy) + '%';
    valClean.textContent = Math.round(state.clean) + '%';

    // Color warnings
    statHunger.style.background = state.hunger < 30 ? '#f44336' : 'var(--bar-hunger)';
    statHappy.style.background = state.happy < 30 ? '#9c27b0' : 'var(--bar-happy)';
    statEnergy.style.background = state.energy < 30 ? '#607d8b' : 'var(--bar-energy)';
    statClean.style.background = state.clean < 30 ? '#795548' : 'var(--bar-clean)';
}

function renderPet() {
    const stage = getCurrentStage();
    petEmoji.textContent = stage.emoji;
    stageBadge.textContent = ${stage.emoji} ;
    petMood.textContent = getMood();
    ageBadge.textContent = 年龄:  分钟;
    totalBadge.textContent = 互动:  次;

    if (state.isSleeping) {
        petCharacter.classList.add('sleeping');
        petAura.style.background = 'radial-gradient(circle, rgba(100, 100, 200, 0.4), transparent 70%)';
        document.body.classList.add('night-mode');
    } else {
        petCharacter.classList.remove('sleeping');
        petAura.style.background = 'radial-gradient(circle, rgba(255, 200, 100, 0.3), transparent 70%)';
        document.body.classList.remove('night-mode');
    }
}

function renderAll() {
    renderStats();
    renderPet();
    renderAchievements();
}

// ===== Actions =====
function canAct(action) {
    if (state.isSleeping && action !== 'sleep') {
        speak('sleep');
        return false;
    }
    if (actionCooldowns[action] && Date.now() < actionCooldowns[action]) {
        return false;
    }
    return true;
}

function doAction(action) {
    if (!canAct(action)) return;
    initAudio();

    switch (action) {
        case 'feed':
            state.hunger = Math.min(100, state.hunger + 25);
            state.clean = Math.max(0, state.clean - 5);
            petCharacter.classList.add('eating');
            setTimeout(() => petCharacter.classList.remove('eating'), 800);
            sfxFeed();
            speak('feed');
            spawnParticles('🍞', 6);
            break;

        case 'play':
            state.happy = Math.min(100, state.happy + 25);
            state.energy = Math.max(0, state.energy - 15);
            state.clean = Math.max(0, state.clean - 8);
            petCharacter.classList.add('bounce');
            setTimeout(() => petCharacter.classList.remove('bounce'), 600);
            sfxPlay();
            speak('play');
            spawnParticles('⚽', 10);
            break;

        case 'clean':
            state.clean = Math.min(100, state.clean + 30);
            state.happy = Math.min(100, state.happy + 5);
            petCharacter.classList.add('clean');
            setTimeout(() => petCharacter.classList.remove('clean'), 600);
            sfxClean();
            speak('clean');
            spawnParticles('✨', 12);
            break;

        case 'sleep':
            if (state.isSleeping) {
                state.isSleeping = false;
                state.sleepStart = null;
                petCharacter.classList.remove('sleeping');
                document.body.classList.remove('night-mode');
                speak('idle');
            } else {
                state.isSleeping = true;
                state.sleepStart = Date.now();
                petCharacter.classList.add('sleeping');
                document.body.classList.add('night-mode');
                sfxSleep();
                speak('sleep');
                spawnParticles('💤', 6);
            }
            break;
    }

    state.totalActions++;
    actionCooldowns[action] = Date.now() + 1500;

    const prevStage = getCurrentStage();
    checkAchievements();
    const newStage = getCurrentStage();
    if (prevStage.name !== newStage.name && newStage.minAge > 0) {
        sfxEvolve();
        speak('evolve');
        spawnParticles('🎉', 20);
    }

    saveState();
    renderAll();

    // Remove cooldown visual
    setTimeout(() => {
        delete actionCooldowns[action];
        document.querySelectorAll('.action-btn').forEach(b => b.classList.remove('cooldown'));
    }, 1500);
}

// ===== Tick (stat decay) =====
function tick() {
    if (state.isSleeping) {
        const sleepMinutes = (Date.now() - state.sleepStart) / 1000 / 60;
        state.energy = Math.min(100, state.energy + sleepMinutes * 3);
        state.age += sleepMinutes;
        state.sleepStart = Date.now();
        state.hunger = Math.max(0, state.hunger - sleepMinutes * 0.3);
        state.happy = Math.max(0, state.happy - sleepMinutes * 0.2);
        state.clean = Math.max(0, state.clean - sleepMinutes * 0.2);
    } else {
        const elapsed = 1 / 60; // 1 second tick
        state.hunger = Math.max(0, state.hunger - elapsed * 0.8);
        state.happy = Math.max(0, state.happy - elapsed * 0.5);
        state.energy = Math.max(0, state.energy - elapsed * 0.3);
        state.clean = Math.max(0, state.clean - elapsed * 0.4);
        state.age += elapsed;
    }

    // Auto-speak when stats are low
    if (state.hunger < 30 && Math.random() < 0.02) speak('hungry');
    if (state.clean < 30 && Math.random() < 0.02) speak('dirty');
    if (state.energy < 30 && Math.random() < 0.02) speak('tired');

    checkAchievements();
    saveState();
    renderAll();
}

// ===== Click Pet =====
petCharacter.addEventListener('click', () => {
    if (state.isSleeping) return;
    initAudio();
    petCharacter.classList.add('wiggle');
    setTimeout(() => petCharacter.classList.remove('wiggle'), 500);
    state.happy = Math.min(100, state.happy + 3);
    state.totalActions++;
    speak('idle');
    saveState();
    renderAll();
    playTone(800 + Math.random() * 400, 'sine', 0.1, 0.05);
});

// ===== Action Buttons =====
document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (actionCooldowns[action]) {
            btn.classList.add('cooldown');
            setTimeout(() => btn.classList.remove('cooldown'), 1500);
            return;
        }
        doAction(action);
    });
});

// ===== Add toast animation =====
const toastStyle = document.createElement('style');
toastStyle.textContent = 
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-30px); }
    }
;
document.head.appendChild(toastStyle);

// ===== Init =====
loadState();
renderAll();
tickInterval = setInterval(tick, 1000);

// Auto-idle speech
setInterval(() => {
    if (!state.isSleeping && Math.random() < 0.1 && !petSpeech.classList.contains('show')) {
        const avg = (state.hunger + state.happy + state.energy + state.clean) / 4;
        if (state.hunger < 30) speak('hungry');
        else if (state.clean < 30) speak('dirty');
        else if (state.energy < 30) speak('tired');
        else if (Math.random() < 0.3) speak('idle');
    }
}, 15000);

console.log('🦆🐑 DuckSheep 已就绪！');
console.log('你的虚拟宠物伙伴正在等待你的照顾~');
console.log('试试点击宠物或者使用按钮互动吧！');
