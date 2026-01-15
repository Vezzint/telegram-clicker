// Проверка версии и принудительное обновление
const GAME_VERSION = '2.2';
const savedVersion = localStorage.getItem('gameVersion');

if (savedVersion !== GAME_VERSION) {
    console.log('Обновление игры до версии ' + GAME_VERSION);
    localStorage.setItem('gameVersion', GAME_VERSION);
    
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    
    window.location.reload(true);
}

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Получение данных пользователя из Telegram
function getUserData() {
    console.log('Telegram WebApp initData:', tg.initDataUnsafe);
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        console.log('User data:', user);
        
        return {
            id: user.id,
            first_name: user.first_name || 'Player',
            last_name: user.last_name || '',
            username: user.username || '',
            photo_url: user.photo_url || ''
        };
    }
    
    return {
        id: 0,
        first_name: 'Player',
        last_name: '',
        username: '',
        photo_url: ''
    };
}

// Игровое состояние
let gameState = {
    points: 0,
    totalEarned: 0,
    totalClicks: 0,
    pointsPerClick: 1,
    pointsPerSecond: 0,
    level: 1,
    experience: 0,
    upgrades: [],
    achievements: [],
    boosters: [],
    startTime: Date.now(),
    upgradesBought: 0,
    criticalHits: 0,
    bestCombo: 0,
    currentCombo: 0,
    comboTimer: null,
    criticalChance: 0.05,
    criticalMultiplier: 2,
    multiplier: 1,
    energy: 100,
    maxEnergy: 100,
    energyRegenRate: 1,
    lastBonusTime: 0
};

// Определение улучшений
const upgradeDefinitions = [
    {
        id: 'cursor',
        name: 'Магический курсор',
        icon: '👆',
        description: 'Увеличивает силу клика',
        baseCost: 10,
        baseProfit: 1,
        profitType: 'click',
        costMultiplier: 1.15
    },
    {
        id: 'energy',
        name: 'Кристалл энергии',
        icon: '⚡',
        description: '+10 макс. энергии',
        baseCost: 25,
        baseProfit: 10,
        profitType: 'energy',
        costMultiplier: 1.2
    },
    {
        id: 'critical',
        name: 'Око удачи',
        icon: '🎯',
        description: '+2% шанс крита',
        baseCost: 100,
        baseProfit: 0.02,
        profitType: 'critical',
        costMultiplier: 1.3
    },
    {
        id: 'auto1',
        name: 'Младший маг',
        icon: '🧙',
        description: 'Генерирует 1 очко/сек',
        baseCost: 50,
        baseProfit: 1,
        profitType: 'auto',
        costMultiplier: 1.2
    },
    {
        id: 'auto2',
        name: 'Кристальная шахта',
        icon: '⛏️',
        description: 'Генерирует 5 очков/сек',
        baseCost: 250,
        baseProfit: 5,
        profitType: 'auto',
        costMultiplier: 1.25
    },
    {
        id: 'auto3',
        name: 'Портал энергии',
        icon: '🌀',
        description: 'Генерирует 20 очков/сек',
        baseCost: 1000,
        baseProfit: 20,
        profitType: 'auto',
        costMultiplier: 1.3
    },
    {
        id: 'auto4',
        name: 'Древний храм',
        icon: '🏛️',
        description: 'Генерирует 100 очков/сек',
        baseCost: 5000,
        baseProfit: 100,
        profitType: 'auto',
        costMultiplier: 1.35
    },
    {
        id: 'auto5',
        name: 'Космический генератор',
        icon: '🛸',
        description: 'Генерирует 500 очков/сек',
        baseCost: 25000,
        baseProfit: 500,
        profitType: 'auto',
        costMultiplier: 1.4
    }
];

// Определение бустеров
const boosterDefinitions = [
    {
        id: 'double',
        name: 'Двойной удар',
        icon: '⚔️',
        description: 'x2 очков за клик',
        cost: 500,
        duration: 30000,
        effect: 'multiplier',
        value: 2
    },
    {
        id: 'triple',
        name: 'Тройная сила',
        icon: '🔱',
        description: 'x3 очков за клик',
        cost: 1500,
        duration: 30000,
        effect: 'multiplier',
        value: 3
    },
    {
        id: 'frenzy',
        name: 'Безумие',
        icon: '💥',
        description: 'x5 всех доходов',
        cost: 5000,
        duration: 20000,
        effect: 'frenzy',
        value: 5
    },
    {
        id: 'energy_boost',
        name: 'Энергетический взрыв',
        icon: '⚡',
        description: 'Восстановить энергию',
        cost: 300,
        duration: 0,
        effect: 'energy',
        value: 100
    }
];

// Определение достижений
const achievementDefinitions = [
    { id: 'clicks_10', icon: '👆', name: 'Новичок', description: '10 кликов', requirement: 10, type: 'clicks' },
    { id: 'clicks_100', icon: '✨', name: 'Кликер', description: '100 кликов', requirement: 100, type: 'clicks' },
    { id: 'clicks_1000', icon: '⚡', name: 'Мастер', description: '1000 кликов', requirement: 1000, type: 'clicks' },
    { id: 'clicks_10000', icon: '🌟', name: 'Легенда', description: '10000 кликов', requirement: 10000, type: 'clicks' },
    { id: 'points_100', icon: '💎', name: 'Богач', description: '100 очков', requirement: 100, type: 'points' },
    { id: 'points_1000', icon: '💰', name: 'Магнат', description: '1000 очков', requirement: 1000, type: 'points' },
    { id: 'points_10000', icon: '👑', name: 'Король', description: '10000 очков', requirement: 10000, type: 'points' },
    { id: 'points_100000', icon: '🏆', name: 'Император', description: '100000 очков', requirement: 100000, type: 'points' },
    { id: 'upgrades_5', icon: '🎯', name: 'Улучшатель', description: '5 улучшений', requirement: 5, type: 'upgrades' },
    { id: 'upgrades_15', icon: '🚀', name: 'Коллекционер', description: '15 улучшений', requirement: 15, type: 'upgrades' },
    { id: 'level_5', icon: '⭐', name: 'Звезда', description: 'Уровень 5', requirement: 5, type: 'level' },
    { id: 'level_10', icon: '💫', name: 'Супер звезда', description: 'Уровень 10', requirement: 10, type: 'level' },
    { id: 'combo_10', icon: '🔥', name: 'Горячие руки', description: 'Комбо x10', requirement: 10, type: 'combo' },
    { id: 'combo_50', icon: '💥', name: 'Безумие', description: 'Комбо x50', requirement: 50, type: 'combo' },
    { id: 'critical_10', icon: '🎯', name: 'Снайпер', description: '10 критов', requirement: 10, type: 'critical' }
];

// Инициализация
function initializeGame() {
    initializeUpgrades();
    initializeAchievements();
    initializeBoosters();
    
    // Получаем данные пользователя из Telegram
    const userData = getUserData();
    console.log('Setting user data:', userData);
    
    // Устанавливаем имя
    const usernameElement = document.getElementById('username');
    if (userData.username) {
        usernameElement.textContent = '@' + userData.username;
    } else {
        usernameElement.textContent = userData.first_name;
    }
    
    // Устанавливаем аватарку
    const avatarElement = document.getElementById('userAvatar');
    
    if (userData.photo_url) {
        console.log('Loading photo from:', userData.photo_url);
        avatarElement.src = userData.photo_url;
        avatarElement.style.display = 'block';
        
        avatarElement.onerror = function() {
            console.log('Photo failed to load, using fallback');
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'avatar';
            fallback.textContent = userData.first_name.charAt(0).toUpperCase();
            fallback.style.fontSize = '24px';
            fallback.style.display = 'flex';
            fallback.style.alignItems = 'center';
            fallback.style.justifyContent = 'center';
            this.parentNode.replaceChild(fallback, this);
        };
    } else {
        console.log('No photo URL, using first letter');
        avatarElement.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'avatar';
        fallback.textContent = userData.first_name.charAt(0).toUpperCase();
        fallback.style.fontSize = '24px';
        fallback.style.display = 'flex';
        fallback.style.alignItems = 'center';
        fallback.style.justifyContent = 'center';
        avatarElement.parentNode.replaceChild(fallback, avatarElement);
    }
}

function initializeUpgrades() {
    gameState.upgrades = upgradeDefinitions.map(def => ({
        ...def,
        level: 0
    }));
}

function initializeAchievements() {
    gameState.achievements = achievementDefinitions.map(def => ({
        ...def,
        unlocked: false,
        isNew: false
    }));
}

function initializeBoosters() {
    gameState.boosters = boosterDefinitions.map(def => ({
        ...def,
        active: false,
        endTime: 0
    }));
}

function loadGame() {
    const saved = localStorage.getItem('darkClickerSave');
    if (saved) {
        const savedState = JSON.parse(saved);
        gameState = { ...gameState, ...savedState };
        
        initializeUpgrades();
        initializeAchievements();
        initializeBoosters();
        
        if (savedState.upgrades) {
            savedState.upgrades.forEach((savedUpgrade, index) => {
                if (gameState.upgrades[index]) {
                    gameState.upgrades[index].level = savedUpgrade.level;
                }
            });
        }
        
        recalculateStats();
    } else {
        initializeGame();
    }
}

function recalculateStats() {
    gameState.pointsPerClick = 1;
    gameState.pointsPerSecond = 0;
    gameState.maxEnergy = 100;
    gameState.criticalChance = 0.05;
    
    gameState.upgrades.forEach(upgrade => {
        for (let i = 0; i < upgrade.level; i++) {
            if (upgrade.profitType === 'click') {
                gameState.pointsPerClick += upgrade.baseProfit;
            } else if (upgrade.profitType === 'auto') {
                gameState.pointsPerSecond += upgrade.baseProfit;
            } else if (upgrade.profitType === 'energy') {
                gameState.maxEnergy += upgrade.baseProfit;
            } else if (upgrade.profitType === 'critical') {
                gameState.criticalChance += upgrade.baseProfit;
            }
        }
    });
}

function saveGame() {
    localStorage.setItem('darkClickerSave', JSON.stringify(gameState));
}

document.getElementById('crystalButton').addEventListener('click', (e) => {
    if (gameState.energy < 1) {
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    gameState.energy = Math.max(0, gameState.energy - 1);
    
    const isCritical = Math.random() < gameState.criticalChance;
    let points = gameState.pointsPerClick * gameState.multiplier;
    
    if (isCritical) {
        points *= gameState.criticalMultiplier;
        gameState.criticalHits++;
        document.getElementById('crystalButton').classList.add('critical');
        setTimeout(() => {
            document.getElementById('crystalButton').classList.remove('critical');
        }, 500);
        tg.HapticFeedback.impactOccurred('heavy');
    } else {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    gameState.points += points;
    gameState.totalEarned += points;
    gameState.totalClicks++;
    gameState.experience += points;
    
    updateCombo();
    showClickIndicator(e.pageX, e.pageY, points, isCritical);
    checkLevelUp();
    checkAchievements();
    updateUI();
    saveGame();
});

function updateCombo() {
    gameState.currentCombo++;
    
    if (gameState.currentCombo > gameState.bestCombo) {
        gameState.bestCombo = gameState.currentCombo;
    }
    
    if (gameState.currentCombo >= 5) {
        const comboDisplay = document.getElementById('comboDisplay');
        comboDisplay.classList.add('show');
        document.getElementById('comboCount').textContent = gameState.currentCombo;
    }
    
    clearTimeout(gameState.comboTimer);
    gameState.comboTimer = setTimeout(() => {
        gameState.currentCombo = 0;
        document.getElementById('comboDisplay').classList.remove('show');
    }, 2000);
}

function showClickIndicator(x, y, points, isCritical) {
    const indicator = document.getElementById('clickIndicator');
    indicator.textContent = `+${formatNumber(points)}`;
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
    indicator.classList.remove('show', 'critical');
    
    if (isCritical) {
        indicator.classList.add('critical');
    }
    
    void indicator.offsetWidth;
    indicator.classList.add('show');
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 800);
}

function checkLevelUp() {
    const requiredExp = getRequiredExperience(gameState.level);
    if (gameState.experience >= requiredExp) {
        gameState.level++;
        gameState.experience -= requiredExp;
        showLevelUpAnimation();
        checkAchievements();
    }
}

function getRequiredExperience(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function showLevelUpAnimation() {
    tg.HapticFeedback.notificationOccurred('success');
}

function checkAchievements() {
    gameState.achievements.forEach(achievement => {
        if (!achievement.unlocked) {
            let progress = 0;
            switch (achievement.type) {
                case 'clicks':
                    progress = gameState.totalClicks;
                    break;
                case 'points':
                    progress = gameState.totalEarned;
                    break;
                case 'upgrades':
                    progress = gameState.upgradesBought;
                    break;
                case 'level':
                    progress = gameState.level;
                    break;
                case 'combo':
                    progress = gameState.bestCombo;
                    break;
                case 'critical':
                    progress = gameState.criticalHits;
                    break;
            }
            
            if (progress >= achievement.requirement) {
                achievement.unlocked = true;
                achievement.isNew = true;
                showAchievementNotification(achievement);
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    });
}

function showAchievementNotification(achievement) {
    console.log('Achievement unlocked:', achievement.name);
}

function buyUpgrade(upgradeId) {
    const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    const cost = getUpgradeCost(upgrade);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        upgrade.level++;
        gameState.upgradesBought++;
        
        if (upgrade.profitType === 'click') {
            gameState.pointsPerClick += upgrade.baseProfit;
        } else if (upgrade.profitType === 'auto') {
            gameState.pointsPerSecond += upgrade.baseProfit;
        } else if (upgrade.profitType === 'energy') {
            gameState.maxEnergy += upgrade.baseProfit;
        } else if (upgrade.profitType === 'critical') {
            gameState.criticalChance += upgrade.baseProfit;
        }
        
        tg.HapticFeedback.impactOccurred('medium');
        checkAchievements();
        updateUI();
        saveGame();
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function getUpgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

function activateBooster(boosterId) {
    const booster = gameState.boosters.find(b => b.id === boosterId);
    if (!booster || booster.active) return;
    
    if (gameState.points >= booster.cost) {
        gameState.points -= booster.cost;
        
        if (booster.effect === 'energy') {
            gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + booster.value);
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            booster.active = true;
            booster.endTime = Date.now() + booster.duration;
            
            if (booster.effect === 'multiplier') {
                gameState.multiplier *= booster.value;
            } else if (booster.effect === 'frenzy') {
                gameState.multiplier *= booster.value;
            }
            
            tg.HapticFeedback.notificationOccurred('success');
            
            setTimeout(() => {
                deactivateBooster(boosterId);
            }, booster.duration);
        }
        
        updateUI();
        saveGame();
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function deactivateBooster(boosterId) {
    const booster = gameState.boosters.find(b => b.id === boosterId);
    if (!booster || !booster.active) return;
    
    if (booster.effect === 'multiplier') {
        gameState.multiplier /= booster.value;
    } else if (booster.effect === 'frenzy') {
        gameState.multiplier /= booster.value;
    }
    
    booster.active = false;
    booster.endTime = 0;
    updateUI();
}

function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateUI() {
    document.getElementById('points').textContent = formatNumber(gameState.points);
    document.getElementById('pointsPerSecond').textContent = formatNumber(gameState.pointsPerSecond * gameState.multiplier);
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('multiplier').textContent = 'x' + gameState.multiplier.toFixed(1);
    document.getElementById('energy').textContent = Math.floor(gameState.energy) + '/' + gameState.maxEnergy;
    
    const energyPercent = (gameState.energy / gameState.maxEnergy) * 100;
    document.getElementById('energyFill').style.width = energyPercent + '%';
    
    const requiredExp = getRequiredExperience(gameState.level);
    const progress = (gameState.experience / requiredExp) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('currentProgress').textContent = formatNumber(gameState.experience);
    document.getElementById('nextLevelRequirement').textContent = formatNumber(requiredExp);
    
    updateBonusTimer();
    renderUpgrades();
    renderBoosters();
    renderAchievements();
    updateStats();
}

function updateBonusTimer() {
    const now = Date.now();
    const timeSinceBonus = now - gameState.lastBonusTime;
    const bonusInterval = 60 * 60 * 1000;
    
    if (timeSinceBonus >= bonusInterval) {
        document.getElementById('bonusTimer').textContent = 'ГОТОВ!';
        document.getElementById('bonusBtn').style.animation = 'pulse-bonus 0.5s ease-in-out infinite';
    } else {
        const timeLeft = bonusInterval - timeSinceBonus;
        document.getElementById('bonusTimer').textContent = formatTime(timeLeft);
    }
}

document.getElementById('bonusBtn').addEventListener('click', () => {
    const now = Date.now();
    const timeSinceBonus = now - gameState.lastBonusTime;
    const bonusInterval = 60 * 60 * 1000;
    
    if (timeSinceBonus >= bonusInterval) {
        showBonusModal();
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
});

function showBonusModal() {
    const bonusAmount = Math.floor(gameState.pointsPerSecond * 100 + gameState.level * 100);
    document.getElementById('bonusAmount').textContent = '+' + formatNumber(bonusAmount) + ' 💎';
    document.getElementById('bonusModal').classList.add('show');
    
    document.getElementById('claimBonus').onclick = () => {
        gameState.points += bonusAmount;
        gameState.totalEarned += bonusAmount;
        gameState.lastBonusTime = Date.now();
        document.getElementById('bonusModal').classList.remove('show');
        tg.HapticFeedback.notificationOccurred('success');
        updateUI();
        saveGame();
    };
}

function renderUpgrades() {
    const container = document.getElementById('upgradesList');
    container.innerHTML = '';
    
    gameState.upgrades.forEach(upgrade => {
        const cost = getUpgradeCost(upgrade);
        const canAfford = gameState.points >= cost;
        
        const item = document.createElement('div');
        item.className = `upgrade-item ${canAfford ? 'affordable' : ''}`;
        
        let profitText = '';
        if (upgrade.profitType === 'click') {
            profitText = `+${upgrade.baseProfit} за клик`;
        } else if (upgrade.profitType === 'auto') {
            profitText = `+${upgrade.baseProfit}/сек`;
        } else if (upgrade.profitType === 'energy') {
            profitText = `+${upgrade.baseProfit} энергии`;
        } else if (upgrade.profitType === 'critical') {
            profitText = `+${(upgrade.baseProfit * 100).toFixed(0)}% крит`;
        }
        
        item.innerHTML = `
            <div class="upgrade-icon">${upgrade.icon}</div>
            <div class="upgrade-info">
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-description">${upgrade.description}</div>
                <div class="upgrade-stats">
                    <span class="upgrade-level">Уровень: ${upgrade.level}</span>
                    <span class="upgrade-profit">${profitText}</span>
                </div>
            </div>
            <button class="upgrade-buy" ${!canAfford ? 'disabled' : ''} onclick="buyUpgrade('${upgrade.id}')">
                ${formatNumber(cost)}
            </button>
        `;
        
        container.appendChild(item);
    });
}

function renderBoosters() {
    const container = document.getElementById('boostersList');
    container.innerHTML = '';
    
    gameState.boosters.forEach(booster => {
        const canAfford = gameState.points >= booster.cost;
        
        const item = document.createElement('div');
        item.className = `booster-item ${booster.active ? 'active' : ''} ${!canAfford && !booster.active ? 'disabled' : ''}`;
        
        let timerHTML = '';
        if (booster.active) {
            const timeLeft = Math.max(0, booster.endTime - Date.now());
            timerHTML = `<div class="booster-timer">${formatTime(timeLeft)}</div>`;
        }
        
        item.innerHTML = `
            <div class="booster-icon">${booster.icon}</div>
            <div class="booster-name">${booster.name}</div>
            <div class="booster-description">${booster.description}</div>
            <div class="booster-cost">${formatNumber(booster.cost)} 💎</div>
            ${timerHTML}
        `;
        
        if (!booster.active && canAfford) {
            item.onclick = () => activateBooster(booster.id);
        }
        
        container.appendChild(item);
    });
}

function renderAchievements() {
    const container = document.getElementById('achievementsList');
    container.innerHTML = '';
    
    gameState.achievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = `achievement-item ${achievement.unlocked ? 'unlocked' : ''} ${achievement.isNew ? 'new' : ''}`;
        
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
        `;
        
        if (achievement.isNew) {
            item.onclick = () => {
                achievement.isNew = false;
                item.classList.remove('new');
                saveGame();
            };
        }
        
        container.appendChild(item);
    });
}

function updateStats() {
    document.getElementById('totalClicks').textContent = formatNumber(gameState.totalClicks);
    document.getElementById('totalEarned').textContent = formatNumber(gameState.totalEarned);
    document.getElementById('upgradesBought').textContent = gameState.upgradesBought;
    document.getElementById('criticalHits').textContent = formatNumber(gameState.criticalHits);
    document.getElementById('bestCombo').textContent = gameState.bestCombo;
    
    const playTime = Math.floor((Date.now() - gameState.startTime) / 60000);
    document.getElementById('playTime').textContent = playTime + ' мин';
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tabName).classList.add('active');
        
        tg.HapticFeedback.impactOccurred('light');
    });
});

setInterval(() => {
    if (gameState.pointsPerSecond > 0) {
        const earned = (gameState.pointsPerSecond * gameState.multiplier) / 10;
        gameState.points += earned;
        gameState.totalEarned += earned;
        gameState.experience += earned;
        checkLevelUp();
        updateUI();
    }
}, 100);

setInterval(() => {
    if (gameState.energy < gameState.maxEnergy) {
        gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + (gameState.energyRegenRate / 10));
        updateUI();
    }
}, 100);

setInterval(() => {
    gameState.boosters.forEach(booster => {
        if (booster.active && Date.now() >= booster.endTime) {
            deactivateBooster(booster.id);
        }
    });
    updateBonusTimer();
}, 1000);

setInterval(() => {
    saveGame();
}, 5000);

document.getElementById('bonusModal').addEventListener('click', (e) => {
    if (e.target.id === 'bonusModal') {
        document.getElementById('bonusModal').classList.remove('show');
    }
});

loadGame();
updateUI();

function sendDataToBot() {
    const data = {
        action: 'save_progress',
        points: gameState.points,
        level: gameState.level,
        totalClicks: gameState.totalClicks
    };
    
    tg.sendData(JSON.stringify(data));
}

tg.MainButton.text = "Сохранить прогресс";
tg.MainButton.onClick(sendDataToBot);

if (gameState.level > 1) {
    tg.MainButton.show();
}
