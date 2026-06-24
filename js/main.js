/* ============================================
   DuckSheep v2.0 - Core Engine
   Virtual Pet with Canvas, MiniGame, Shop
   ============================================ */

// ===== State =====
const defaultState = {
    petName: 'DuckSheep',
    hunger: 100,
    happy: 100,
    energy: 100,
    clean: 100,
    age: 0,
    totalActions: 0,
    coins: 100,
    lastTick: Date.now(),
    isSleeping: false,
    sleepStart: null,
    achievements: [],
    inventory: [],
    equippedAccessory: null,
    currentView: 'home',
};

let state = { ...defaultState };
let speechTimeout = null;
let tickInterval = null;
let petAnimState = 'idle';
let animStateTimer = 0;

// ===== Shop Items =====
const SHOP_ITEMS = [
    { id: 'bread', name: '面包', icon: '🍞', price: 20, type: 'food', desc: '恢复30饱腹度', effect: { hunger: 30 } },
    { id: 'cake', name: '蛋糕', icon: '🍰', price: 50, type: 'food', desc: '恢复50饱腹度+10快乐', effect: { hunger: 50, happy: 10 } },
    { id: 'ball', name: '皮球', icon: '⚽', price: 30, type: 'toy', desc: '玩耍时额外+10快乐', effect: { happy: 10 } },
    { id: 'soap', name: '香皂', icon: '🧼', price: 25, type: 'toy', desc: '清洁时额外+15清洁', effect: { clean: 15 } },
    { id: 'hat', name: '小帽子', icon: '🎩', price: 80, type: 'accessory', desc: '给宠物戴上一顶帽子', accessory: 'hat' },
    { id: 'bow', name: '蝴蝶结', icon: '🎀', price: 60, type: 'accessory', desc: '可爱的蝴蝶结', accessory: 'bow' },
    { id: 'crown', name: '皇冠', icon: '👑', price: 200, type: 'accessory', desc: '王者专属皇冠', accessory: 'crown' },
    { id: 'glasses', name: '墨镜', icon: '🕶️', price: 100, type: 'accessory', desc: '酷酷的墨镜', accessory: 'glasses' },
];

// ===== Evolution =====
const EVOLUTION_STAGES = {
    egg:    { name: '孵化中', minAge: 0,    mood: '🤔 等待孵化...' },
    baby:   { name: '宝宝期', minAge: 3,    mood: '👶 我是宝宝！' },
    growing:{ name: '成长期', minAge: 15,   mood: '🌱 正在长大！' },
    adult:  { name: '成熟期', minAge: 40,   mood: '😎 我长大了！' },
    master: { name: '完全体', minAge: 120,  mood: '👑 我是王者！' },
};

function getCurrentStage() {
    const stages = Object.values(EVOLUTION_STAGES).reverse();
    for (const stage of stages) {
        if (state.age >= stage.minAge) return stage;
    }
    return EVOLUTION_STAGES.egg;
}

function getStageEmoji() {
    const stage = getCurrentStage();
    if (stage === EVOLUTION_STAGES.egg) return '🥚';
    if (stage === EVOLUTION_STAGES.baby) return '🐣';
    if (stage === EVOLUTION_STAGES.growing) return '🐥';
    if (stage === EVOLUTION_STAGES.adult) return '🦆';
    return '🦚';
}

// ===== Achievements =====
const ACHIEVEMENTS = [
    { id: 'first_feed', icon: '🍞', name: '初次喂食', cond: s => s.totalActions >= 1 },
    { id: 'first_play', icon: '⚽', name: '初次玩耍', cond: s => s.totalActions >= 2 },
    { id: 'ten_actions', icon: '🔟', name: '10次互动', cond: s => s.totalActions >= 10 },
    { id: 'fifty_actions', icon: '💯', name: '50次互动', cond: s => s.totalActions >= 50 },
    { id: 'baby_grown', icon: '🐣', name: '孵化成功', cond: s => s.age >= 3 },
    { id: 'adult_reach', icon: '🦆', name: '长大成人', cond: s => s.age >= 40 },
    { id: 'master_reach', icon: '🦚', name: '完全体', cond: s => s.age >= 120 },
    { id: 'perfect_stats', icon: '🌟', name: '满分状态', cond: s => s.hunger >= 90 && s.happy >= 90 && s.energy >= 90 && s.clean >= 90 },
    { id: 'rich', icon: '💰', name: '小富翁', cond: s => s.coins >= 500 },
    { id: 'game_master', icon: '🎮', name: '游戏高手', cond: s => s.totalActions >= 20 },
    { id: 'fashionista', icon: '👗', name: '时尚达人', cond: s => s.inventory.filter(i => SHOP_ITEMS.find(si => si.id === i)?.type === 'accessory').length >= 2 },
    { id: 'collector', icon: '🎒', name: '收藏家', cond: s => s.inventory.length >= 5 },
];

// ===== Speeches =====
const speeches = {
    feed: ['好吃好吃！', '再来一点！', '嘎嘎，美味！', '咩～谢谢！', '吃饱了！🍞'],
    play: ['好开心！', '再来再来！', '嘎嘎嘎～', '咩咩咩！', '太好玩了！'],
    clean: ['好干净！✨', '闪闪发光！', '舒服多了！', '谢谢你！🛁'],
    sleep: ['晚安...💤', '呼噜...呼噜...', 'Zzz...', '做个好梦！'],
    idle: ['好无聊哦...', '陪我玩嘛～', '嘎？', '咩～', '你在干嘛？', '今天天气真好！'],
    hungry: ['好饿...', '有没有吃的？', '肚子咕咕叫...'],
    dirty: ['好脏啊...', '想洗澡...', '帮我洗洗吧～'],
    tired: ['好累...', '想睡觉...', '没力气了...'],
    evolve: ['我进化了！🎉', '变强了！', '新的我！'],
};

// ===== Audio =====
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playTone(f, t, d, v) {
    if (!audioCtx) return;
    v = v || 0.08;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = t; o.frequency.setValueAtTime(f, audioCtx.currentTime);
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + d);
}
function sfx(action) {
    if (action === 'feed') { playTone(523, 'sine', 0.12); setTimeout(() => playTone(659, 'sine', 0.12), 80); }
    if (action === 'play') { playTone(440, 'square', 0.08); setTimeout(() => playTone(554, 'square', 0.08), 60); setTimeout(() => playTone(659, 'square', 0.08), 120); }
    if (action === 'clean') { playTone(880, 'sine', 0.25, 0.04); }
    if (action === 'sleep') { playTone(220, 'triangle', 0.4, 0.06); }
    if (action === 'evolve') { playTone(523, 'sine', 0.15); setTimeout(() => playTone(659, 'sine', 0.15), 120); setTimeout(() => playTone(784, 'sine', 0.25), 240); }
    if (action === 'buy') { playTone(660, 'sine', 0.1); setTimeout(() => playTone(880, 'sine', 0.15), 80); }
    if (action === 'coin') { playTone(1200, 'sine', 0.08, 0.04); }
}

// ===== Persistence =====
function saveState() {
    state.lastTick = Date.now();
    localStorage.setItem('ducksheep_v2_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('ducksheep_v2_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...defaultState, ...parsed };
            const elapsed = (Date.now() - state.lastTick) / 1000 / 60;
            if (elapsed > 0 && !state.isSleeping) {
                state.hunger = Math.max(0, state.hunger - elapsed * 0.8);
                state.happy = Math.max(0, state.happy - elapsed * 0.5);
                state.energy = Math.max(0, state.energy - elapsed * 0.3);
                state.clean = Math.max(0, state.clean - elapsed * 0.4);
                state.age += elapsed;
            }
            if (state.isSleeping) {
                const se = (Date.now() - state.sleepStart) / 1000 / 60;
                state.energy = Math.min(100, state.energy + se * 3);
                state.age += se;
                state.sleepStart = Date.now();
            }
        } catch (e) { state = { ...defaultState }; }
    }
}

// ===== Speech =====
function speak(category) {
    const msgs = speeches[category] || speeches.idle;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    const el = document.getElementById('pet-speech');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (speechTimeout) clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => el.classList.remove('show'), 2500);
}

// ===== Particles =====
function spawnParticles(emoji, count) {
    count = count || 8;
    const container = document.getElementById('particles');
    const pet = document.getElementById('pet-canvas');
    if (!container || !pet) return;
    const rect = pet.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const items = ['✨', '💫', '🌟', '💖', emoji, '🎉', '💕', '⭐'];
    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        p.textContent = items[Math.floor(Math.random() * items.length)];
        p.style.left = (cx + (Math.random() - 0.5) * 120) + 'px';
        p.style.top = (cy + (Math.random() - 0.5) * 60) + 'px';
        p.style.animationDuration = (1 + Math.random() * 1.5) + 's';
        p.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
        container.appendChild(p);
        setTimeout(() => p.remove(), 2000);
    }
}

// ===== Achievements =====
function checkAchievements() {
    let changed = false;
    for (const ach of ACHIEVEMENTS) {
        if (!state.achievements.includes(ach.id) && ach.cond(state)) {
            state.achievements.push(ach.id);
            changed = true;
            showToast(ach.icon + ' 成就解锁: ' + ach.name);
            sfx('evolve');
        }
    }
    if (changed) saveState();
    renderAchievements();
}

function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ffd700,#ffb300);padding:10px 20px;border-radius:25px;font-weight:700;color:#5d4037;z-index:1000;box-shadow:0 8px 30px rgba(255,179,0,0.4);animation:toastIn 0.5s ease,toastOut 0.5s ease 2.5s forwards;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

// ===== View Switching =====
function switchView(view) {
    state.currentView = view;
    document.getElementById('view-home').style.display = view === 'home' ? 'block' : 'none';
    document.getElementById('view-game').style.display = view === 'game' ? 'block' : 'none';
    document.getElementById('view-shop').style.display = view === 'shop' ? 'block' : 'none';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector('.nav-btn[data-view="' + view + '"]');
    if (navBtn) navBtn.classList.add('active');
    if (view === 'game') MiniGame.start();
    if (view === 'shop') renderShop();
    if (view === 'home') renderAll();
}

// ===== Shop =====
function renderShop() {
    const grid = document.getElementById('shop-grid');
    const coinDisplay = document.getElementById('shop-coins');
    if (!grid) return;
    if (coinDisplay) coinDisplay.textContent = state.coins;
    grid.innerHTML = SHOP_ITEMS.map(function(item) {
        const owned = state.inventory.includes(item.id);
        const equipped = state.equippedAccessory === item.accessory;
        var btnHtml = '';
        if (owned) {
            if (item.type === 'accessory') {
                btnHtml = '<button class="shop-btn' + (equipped ? ' equipped' : '') + '" onclick="equipAccessory(\'' + item.id + '\')">' + (equipped ? '✅ 已装备' : '👗 装备') + '</button>';
            } else {
                btnHtml = '<button class="shop-btn owned-btn" disabled>✅ 已拥有</button>';
            }
        } else {
            btnHtml = '<button class="shop-btn" onclick="buyItem(\'' + item.id + '\')"' + (state.coins < item.price ? ' disabled' : '') + '>🛒 购买</button>';
        }
        return '<div class="shop-item' + (owned ? ' owned' : '') + '">' +
            '<div class="shop-item-icon">' + item.icon + '</div>' +
            '<div class="shop-item-name">' + item.name + '</div>' +
            '<div class="shop-item-desc">' + item.desc + '</div>' +
            '<div class="shop-item-price">💰 ' + item.price + '</div>' +
            btnHtml +
            '</div>';
    }).join('');
}

function buyItem(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || state.coins < item.price) return;
    if (state.inventory.includes(id)) return;
    state.coins -= item.price;
    state.inventory.push(id);
    sfx('buy');
    saveState();
    renderShop();
    renderAll();
    showToast('✅ 购买了 ' + item.name + '！');
}

function equipAccessory(id) {
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item || !item.accessory) return;
    if (state.equippedAccessory === item.accessory) {
        state.equippedAccessory = null;
    } else {
        state.equippedAccessory = item.accessory;
    }
    PetRenderer.accessory = state.equippedAccessory;
    saveState();
    renderShop();
}

// ===== Render =====
function renderStats() {
    const hungerEl = document.getElementById('stat-hunger');
    const happyEl = document.getElementById('stat-happy');
    const energyEl = document.getElementById('stat-energy');
    const cleanEl = document.getElementById('stat-clean');
    const vHunger = document.getElementById('val-hunger');
    const vHappy = document.getElementById('val-happy');
    const vEnergy = document.getElementById('val-energy');
    const vClean = document.getElementById('val-clean');
    if (hungerEl) hungerEl.style.width = state.hunger + '%';
    if (happyEl) happyEl.style.width = state.happy + '%';
    if (energyEl) energyEl.style.width = state.energy + '%';
    if (cleanEl) cleanEl.style.width = state.clean + '%';
    if (vHunger) vHunger.textContent = Math.round(state.hunger) + '%';
    if (vHappy) vHappy.textContent = Math.round(state.happy) + '%';
    if (vEnergy) vEnergy.textContent = Math.round(state.energy) + '%';
    if (vClean) vClean.textContent = Math.round(state.clean) + '%';
}

function renderAll() {
    const stage = getCurrentStage();
    const elName = document.getElementById('pet-name');
    const elMood = document.getElementById('pet-mood');
    const elStage = document.getElementById('stage-badge');
    const elAge = document.getElementById('age-badge');
    const elActions = document.getElementById('total-badge');
    const elCoins = document.getElementById('coin-display');
    if (elName) elName.textContent = state.petName;
    if (elMood) elMood.textContent = state.isSleeping ? '😴 睡觉中...' : getMoodText();
    if (elStage) elStage.textContent = getStageEmoji() + ' ' + stage.name;
    if (elAge) elAge.textContent = '年龄: ' + Math.floor(state.age) + '分';
    if (elActions) elActions.textContent = '互动: ' + state.totalActions + '次';
    if (elCoins) elCoins.textContent = state.coins;
    renderStats();
    renderAchievements();
}

function getMoodText() {
    const avg = (state.hunger + state.happy + state.energy + state.clean) / 4;
    if (avg >= 90) return '😆 超开心！';
    if (avg >= 70) return '😊 很开心';
    if (avg >= 50) return '😐 一般般';
    if (avg >= 30) return '😟 不太舒服';
    if (avg >= 10) return '😢 好难受...';
    return '💀 快不行了...';
}

function renderAchievements() {
    const list = document.getElementById('achievement-list');
    if (!list) return;
    list.innerHTML = ACHIEVEMENTS.map(function(ach) {
        const unlocked = state.achievements.includes(ach.id);
        return '<span class="achievement-badge' + (unlocked ? ' unlocked' : '') + '" title="' + ach.name + '">' + (unlocked ? ach.icon : '🔒') + ' ' + ach.name + '</span>';
    }).join('');
}

// ===== Actions =====
function doAction(action) {
    if (state.isSleeping && action !== 'sleep') { speak('sleep'); return; }
    initAudio();
    switch (action) {
        case 'feed':
            state.hunger = Math.min(100, state.hunger + 25);
            state.clean = Math.max(0, state.clean - 5);
            petAnimState = 'eating';
            animStateTimer = 800;
            sfx('feed');
            speak('feed');
            spawnParticles('🍞', 6);
            break;
        case 'play':
            state.happy = Math.min(100, state.happy + 25);
            state.energy = Math.max(0, state.energy - 15);
            state.clean = Math.max(0, state.clean - 8);
            petAnimState = 'happy';
            animStateTimer = 800;
            sfx('play');
            speak('play');
            spawnParticles('⚽', 10);
            break;
        case 'clean':
            state.clean = Math.min(100, state.clean + 30);
            state.happy = Math.min(100, state.happy + 5);
            sfx('clean');
            speak('clean');
            spawnParticles('✨', 12);
            break;
        case 'sleep':
            if (state.isSleeping) {
                state.isSleeping = false;
                state.sleepStart = null;
                petAnimState = 'idle';
            } else {
                state.isSleeping = true;
                state.sleepStart = Date.now();
                petAnimState = 'sleeping';
                sfx('sleep');
                speak('sleep');
                spawnParticles('💤', 6);
            }
            break;
    }
    state.totalActions++;
    const prevStage = getCurrentStage();
    checkAchievements();
    const newStage = getCurrentStage();
    if (prevStage.name !== newStage.name && newStage.minAge > 0) {
        sfx('evolve');
        speak('evolve');
        spawnParticles('🎉', 20);
        showToast('🎉 ' + state.petName + ' 进化到了 ' + newStage.name + '！');
    }
    saveState();
    renderAll();
}

// ===== Pet Naming =====
function showNameEditor() {
    const name = prompt('给你的宠物取个名字吧：', state.petName);
    if (name && name.trim()) {
        state.petName = name.trim().slice(0, 12);
        saveState();
        renderAll();
    }
}

// ===== Tick =====
function tick() {
    if (state.isSleeping) {
        const sm = (Date.now() - state.sleepStart) / 1000 / 60;
        state.energy = Math.min(100, state.energy + sm * 3);
        state.age += sm;
        state.sleepStart = Date.now();
        state.hunger = Math.max(0, state.hunger - sm * 0.3);
        state.happy = Math.max(0, state.happy - sm * 0.2);
        state.clean = Math.max(0, state.clean - sm * 0.2);
    } else {
        const e = 1 / 60;
        state.hunger = Math.max(0, state.hunger - e * 0.8);
        state.happy = Math.max(0, state.happy - e * 0.5);
        state.energy = Math.max(0, state.energy - e * 0.3);
        state.clean = Math.max(0, state.clean - e * 0.4);
        state.age += e;
    }
    if (state.hunger < 30 && Math.random() < 0.02) speak('hungry');
    if (state.clean < 30 && Math.random() < 0.02) speak('dirty');
    if (state.energy < 30 && Math.random() < 0.02) speak('tired');
    checkAchievements();
    saveState();
    renderAll();
}

// ===== Animation Loop =====
function animLoop() {
    if (animStateTimer > 0) {
        animStateTimer -= 16.67;
        if (animStateTimer <= 0) petAnimState = state.isSleeping ? 'sleeping' : 'idle';
    }
    const animState = state.isSleeping ? 'sleeping' : petAnimState;
    PetRenderer.update(16.67, state);
    PetRenderer.draw(animState);
    requestAnimationFrame(animLoop);
}

function gameLoop() {
    if (state.currentView === 'game') {
        MiniGame.update();
        MiniGame.draw();
    }
    requestAnimationFrame(gameLoop);
}

// ===== Init =====
function init() {
    loadState();
    PetRenderer.init(document.getElementById('pet-canvas'));
    PetRenderer.accessory = state.equippedAccessory;
    MiniGame.init(document.getElementById('game-canvas'));

    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { switchView(btn.dataset.view); });
    });

    document.querySelectorAll('.action-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { doAction(btn.dataset.action); });
    });

    document.getElementById('pet-canvas').addEventListener('click', function() {
        if (state.isSleeping) return;
        initAudio();
        state.happy = Math.min(100, state.happy + 3);
        state.totalActions++;
        petAnimState = 'happy';
        animStateTimer = 500;
        speak('idle');
        saveState();
        renderAll();
        playTone(800 + Math.random() * 400, 'sine', 0.08, 0.04);
    });

    document.getElementById('pet-name').addEventListener('click', showNameEditor);

    const origStop = MiniGame.stop;
    MiniGame.stop = function() {
        const result = origStop.call(this);
        state.coins += result.coins;
        state.totalActions++;
        saveState();
        renderAll();
        checkAchievements();
        showToast('🎮 游戏结束！获得 ' + result.coins + ' 金币！');
        return result;
    };

    document.getElementById('btn-back-game').addEventListener('click', function() { switchView('home'); });
    document.getElementById('btn-back-shop').addEventListener('click', function() { switchView('home'); });

    renderAll();
    tickInterval = setInterval(tick, 1000);
    requestAnimationFrame(animLoop);
    requestAnimationFrame(gameLoop);

    setInterval(function() {
        if (!state.isSleeping && state.currentView === 'home' && Math.random() < 0.08) {
            const avg = (state.hunger + state.happy + state.energy + state.clean) / 4;
            if (state.hunger < 30) speak('hungry');
            else if (state.clean < 30) speak('dirty');
            else if (state.energy < 30) speak('tired');
            else if (Math.random() < 0.3) speak('idle');
        }
    }, 20000);

    console.log('🦆🐑 DuckSheep v2.0 已就绪！');
}

document.addEventListener('DOMContentLoaded', init);