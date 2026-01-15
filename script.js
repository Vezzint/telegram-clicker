const GAME_VERSION = '3.0';
const savedVersion = localStorage.getItem('gameVersion');

if (savedVersion !== GAME_VERSION) {
    console.log('Обновление игры до версии ' + GAME_VERSION);
    localStorage.setItem('gameVersion', GAME_VERSION);
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
}

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

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
    lastBonusTime: 0,
    lastClickTime: 0,
    clickCooldown: 50,
    theme: 'dark'
};

const upgradeDefinitions = [
    { id: 'cursor', name: 'Магический курсор', icon: '👆', description: 'Увеличивает силу клика', baseCost: 5, baseProfit: 0.5, profitType: 'click', costMultiplier: 1.12 },
    { id: 'cursor2', name: 'Усиленный курсор', icon: '✨', description: 'Еще больше силы клика', baseCost: 20, baseProfit: 1, profitType: 'click', costMultiplier: 1.13 },
    { id: 'cursor3', name: 'Мощный курсор', icon: '💫', description: 'Огромная сила клика', baseCost: 100, baseProfit: 3, profitType: 'click', costMultiplier: 1.14 },
    
    { id: 'energy1', name: 'Кристалл энергии', icon: '⚡', description: '+10 макс. энергии', baseCost: 15, baseProfit: 10, profitType: 'energy', costMultiplier: 1.15 },
    { id: 'energy2', name: 'Энергетический усилитель', icon: '🔋', description: '+20 макс. энергии', baseCost: 80, baseProfit: 20, profitType: 'energy', costMultiplier: 1.18 },
    { id: 'regen1', name: 'Регенерация энергии', icon: '♻️', description: '+0.5 реген/сек', baseCost: 50, baseProfit: 0.5, profitType: 'regen', costMultiplier: 1.2 },
    
    { id: 'critical1', name: 'Око удачи', icon: '🎯', description: '+1% шанс крита', baseCost: 60, baseProfit: 0.01, profitType: 'critical', costMultiplier: 1.25 },
    { id: 'critical2', name: 'Божественная меткость', icon: '🎲', description: '+2% шанс крита', baseCost: 300, baseProfit: 0.02, profitType: 'critical', costMultiplier: 1.3 },
    { id: 'critMulti', name: 'Критическая сила', icon: '💥', description: '+0.5x крит урон', baseCost: 500, baseProfit: 0.5, profitType: 'critMulti', costMultiplier: 1.35 },
    
    { id: 'auto1', name: 'Младший маг', icon: '🧙', description: 'Генерирует 0.5/сек', baseCost: 25, baseProfit: 0.5, profitType: 'auto', costMultiplier: 1.15 },
    { id: 'auto2', name: 'Кристальная шахта', icon: '⛏️', description: 'Генерирует 2/сек', baseCost: 100, baseProfit: 2, profitType: 'auto', costMultiplier: 1.18 },
    { id: 'auto3', name: 'Портал энергии', icon: '🌀', description: 'Генерирует 8/сек', baseCost: 500, baseProfit: 8, profitType: 'auto', costMultiplier: 1.2 },
    { id: 'auto4', name: 'Древний храм', icon: '🏛️', description: 'Генерирует 30/сек', baseCost: 2500, baseProfit: 30, profitType: 'auto', costMultiplier: 1.22 },
    { id: 'auto5', name: 'Космический генератор', icon: '🛸', description: 'Генерирует 120/сек', baseCost: 12000, baseProfit: 120, profitType: 'auto', costMultiplier: 1.25 },
    { id: 'auto6', name: 'Черная дыра', icon: '🌑', description: 'Генерирует 500/сек', baseCost: 60000, baseProfit: 500, profitType: 'auto', costMultiplier: 1.28 },
    { id: 'auto7', name: 'Временной разлом', icon: '⏰', description: 'Генерирует 2000/сек', baseCost: 300000, baseProfit: 2000, profitType: 'auto', costMultiplier: 1.3 },
    { id: 'auto8', name: 'Измерение бесконечности', icon: '♾️', description: 'Генерирует 10000/сек', baseCost: 1500000, baseProfit: 10000, profitType: 'auto', costMultiplier: 1.32 }
];

const boosterDefinitions = [
    { id: 'double', name: 'Двойной удар', icon: '⚔️', description: 'x2 очков за клик', cost: 300, duration: 30000, effect: 'multiplier', value: 2 },
    { id: 'triple', name: 'Тройная сила', icon: '🔱', description: 'x3 очков за клик', cost: 800, duration: 30000, effect: 'multiplier', value: 3 },
    { id: 'mega', name: 'Мега усиление', icon: '⭐', description: 'x5 очков за клик', cost: 2000, duration: 25000, effect: 'multiplier', value: 5 },
    { id: 'frenzy', name: 'Безумие', icon: '💥', description: 'x10 всех доходов', cost: 5000, duration: 15000, effect: 'frenzy', value: 10 },
    { id: 'energy_boost', name: 'Энергетический взрыв', icon: '⚡', description: 'Полная энергия', cost: 200, duration: 0, effect: 'energy', value: 100 },
    { id: 'auto_boost', name: 'Турбо режим', icon: '🚀', description: 'x3 пассивного дохода 1 мин', cost: 1500, duration: 60000, effect: 'autoMulti', value: 3 }
];

const achievementDefinitions = [
    { id: 'clicks_10', icon: '👆', name: 'Новичок', description: '10 кликов', requirement: 10, type: 'clicks', reward: 50 },
    { id: 'clicks_50', icon: '👍', name: 'Активный', description: '50 кликов', requirement: 50, type: 'clicks', reward: 100 },
    { id: 'clicks_100', icon: '✨', name: 'Кликер', description: '100 кликов', requirement: 100, type: 'clicks', reward: 200 },
    { id: 'clicks_500', icon: '💪', name: 'Профи', description: '500 кликов', requirement: 500, type: 'clicks', reward: 500 },
    { id: 'clicks_1000', icon: '⚡', name: 'Мастер', description: '1000 кликов', requirement: 1000, type: 'clicks', reward: 1000 },
    { id: 'clicks_5000', icon: '🔥', name: 'Эксперт', description: '5000 кликов', requirement: 5000, type: 'clicks', reward: 3000 },
    { id: 'clicks_10000', icon: '🌟', name: 'Легенда', description: '10000 кликов', requirement: 10000, type: 'clicks', reward: 8000 },
    
    { id: 'points_50', icon: '💎', name: 'Первые шаги', description: '50 очков', requirement: 50, type: 'points', reward: 25 },
    { id: 'points_100', icon: '💰', name: 'Богач', description: '100 очков', requirement: 100, type: 'points', reward: 50 },
    { id: 'points_500', icon: '💵', name: 'Состоятельный', description: '500 очков', requirement: 500, type: 'points', reward: 150 },
    { id: 'points_1000', icon: '💸', name: 'Магнат', description: '1000 очков', requirement: 1000, type: 'points', reward: 300 },
    { id: 'points_5000', icon: '👑', name: 'Король', description: '5000 очков', requirement: 5000, type: 'points', reward: 1000 },
    { id: 'points_10000', icon: '🏆', name: 'Император', description: '10000 очков', requirement: 10000, type: 'points', reward: 2500 },
    { id: 'points_50000', icon: '💫', name: 'Бог богатства', description: '50000 очков', requirement: 50000, type: 'points', reward: 10000 },
    { id: 'points_100000', icon: '⚜️', name: 'Владыка', description: '100000 очков', requirement: 100000, type: 'points', reward: 25000 },
    
    { id: 'upgrades_1', icon: '🎯', name: 'Первое улучшение', description: '1 улучшение', requirement: 1, type: 'upgrades', reward: 20 },
    { id: 'upgrades_5', icon: '🎪', name: 'Улучшатель', description: '5 улучшений', requirement: 5, type: 'upgrades', reward: 100 },
    { id: 'upgrades_10', icon: '🎨', name: 'Коллекционер', description: '10 улучшений', requirement: 10, type: 'upgrades', reward: 300 },
    { id: 'upgrades_20', icon: '🚀', name: 'Энтузиаст', description: '20 улучшений', requirement: 20, type: 'upgrades', reward: 800 },
    { id: 'upgrades_50', icon: '🌈', name: 'Мастер улучшений', description: '50 улучшений', requirement: 50, type: 'upgrades', reward: 3000 },
    
    { id: 'level_5', icon: '⭐', name: 'Звезда', description: 'Уровень 5', requirement: 5, type: 'level', reward: 200 },
    { id: 'level_10', icon: '💫', name: 'Супер звезда', description: 'Уровень 10', requirement: 10, type: 'level', reward: 500 },
    { id: 'level_20', icon: '🌠', name: 'Сияние', description: 'Уровень 20', requirement: 20, type: 'level', reward: 1500 },
    { id: 'level_30', icon: '✨', name: 'Небесный', description: 'Уровень 30', requirement: 30, type: 'level', reward: 4000 },
    { id: 'level_50', icon: '🌌', name: 'Космический', description: 'Уровень 50', requirement: 50, type: 'level', reward: 12000 },
    
    { id: 'combo_10', icon: '🔥', name: 'Горячие руки', description: 'Комбо x10', requirement: 10, type: 'combo', reward: 150 },
    { id: 'combo_25', icon: '⚡', name: 'Скоростной', description: 'Комбо x25', requirement: 25, type: 'combo', reward: 400 },
    { id: 'combo_50', icon: '💥', name: 'Безумие', description: 'Комбо x50', requirement: 50, type: 'combo', reward: 1000 },
    { id: 'combo_100', icon: '🌪️', name: 'Ураган', description: 'Комбо x100', requirement: 100, type: 'combo', reward: 3000 },
    
    { id: 'critical_10', icon: '🎯', name: 'Снайпер', description: '10 критов', requirement: 10, type: 'critical', reward: 100 },
    { id: 'critical_50', icon: '🎲', name: 'Везунчик', description: '50 критов', requirement: 50, type: 'critical', reward: 500 },
    { id: 'critical_100', icon: '🍀', name: 'Удачливый', description: '100 критов', requirement: 100, type: 'critical', reward: 1200 },
    { id: 'critical_500', icon: '✨', name: 'Мастер критов', description: '500 критов', requirement: 500, type: 'critical', reward: 5000 }
];

const themes = {
    1: 'dark',
    10: 'ocean',
    20: 'forest',
    30: 'fire',
    40: 'cosmic',
    50: 'gold'
};

function initializeGame() {
    initializeUpgrades();
    initializeAchievements();
    initializeBoosters();
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        const usernameElement = document.getElementById('username');
        
        if (user.username) {
            usernameElement.textContent = '@' + user.username;
        } else {
            usernameElement.textContent = user.first_name || 'Player';
        }
        
        const avatarElement = document.getElementById('userAvatar');
        avatarElement.textContent = (user.first_name || 'P').charAt(0).toUpperCase();
    }
}

function initializeUpgrades() {
    gameState.upgrades = upgradeDefinitions.map(def => ({ ...def, level: 0 }));
}

function initializeAchievements() {
    gameState.achievements = achievementDefinitions.map(def => ({ ...def, unlocked: false, isNew: false, claimed: false }));
}

function initializeBoosters() {
    gameState.boosters = boosterDefinitions.map(def => ({ ...def, active: false, endTime: 0 }));
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
                if (gameState.upgrades[index]) gameState.upgrades[index].level = savedUpgrade.level;
            });
        }
        if (savedState.achievements) {
            savedState.achievements.forEach((savedAch, index) => {
                if (gameState.achievements[index]) {
                    gameState.achievements[index].unlocked = savedAch.unlocked;
                    gameState.achievements[index].claimed = savedAch.claimed;
                }
            });
        }
        recalculateStats();
        updateTheme();
    } else {
        initializeGame();
    }
}

function recalculateStats() {
    gameState.pointsPerClick = 1;
    gameState.pointsPerSecond = 0;
    gameState.maxEnergy = 100;
    gameState.energyRegenRate = 1;
    gameState.criticalChance = 0.05;
    gameState.criticalMultiplier = 2;
    
    gameState.upgrades.forEach(upgrade => {
        for (let i = 0; i < upgrade.level; i++) {
            if (upgrade.profitType === 'click') gameState.pointsPerClick += upgrade.baseProfit;
            else if (upgrade.profitType === 'auto') gameState.pointsPerSecond += upgrade.baseProfit;
            else if (upgrade.profitType === 'energy') gameState.maxEnergy += upgrade.baseProfit;
            else if (upgrade.profitType === 'regen') gameState.energyRegenRate += upgrade.baseProfit;
            else if (upgrade.profitType === 'critical') gameState.criticalChance += upgrade.baseProfit;
            else if (upgrade.profitType === 'critMulti') gameState.criticalMultiplier += upgrade.baseProfit;
        }
    });
}

function updateTheme() {
    const themeKeys = Object.keys(themes).map(Number).sort((a, b) => b - a);
    let newTheme = 'dark';
    
    for (const level of themeKeys) {
        if (gameState.level >= level) {
            newTheme = themes[level];
            break;
        }
    }
    
    if (newTheme !== gameState.theme) {
        gameState.theme = newTheme;
        document.body.className = 'theme-' + newTheme;
    }
}

function saveGame() {
    localStorage.setItem('darkClickerSave', JSON.stringify(gameState));
}

document.getElementById('crystalButton').addEventListener('click', (e) => {
    const now = Date.now();
    if (now - gameState.lastClickTime < gameState.clickCooldown) return;
    gameState.lastClickTime = now;
    
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
        setTimeout(() => document.getElementById('crystalButton').classList.remove('critical'), 500);
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
    if (gameState.currentCombo > gameState.bestCombo) gameState.bestCombo = gameState.currentCombo;
    if (gameState.currentCombo >= 5) {
        document.getElementById('comboDisplay').classList.add('show');
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
    if (isCritical) indicator.classList.add('critical');
    void indicator.offsetWidth;
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 800);
}
function checkLevelUp() {
    const requiredExp = getRequiredExperience(gameState.level);
    if (gameState.experience >= requiredExp) {
        gameState.level++;
        gameState.experience -= requiredExp;
        
        const reward = gameState.level * 50;
        gameState.points += reward;
        gameState.totalEarned += reward;
        
        showLevelUpModal(gameState.level, reward);
        updateTheme();
        tg.HapticFeedback.notificationOccurred('success');
        checkAchievements();
    }
}

function getRequiredExperience(level) {
    return Math.floor(50 * Math.pow(1.4, level - 1));
}

function showLevelUpModal(level, reward) {
    document.getElementById('levelUpNumber').textContent = level;
    document.getElementById('levelUpReward').textContent = '+' + formatNumber(reward) + ' 💎';
    document.getElementById('levelUpModal').classList.add('show');
}

document.getElementById('closeLevelUp').addEventListener('click', () => {
    document.getElementById('levelUpModal').classList.remove('show');
});

function checkAchievements() {
    gameState.achievements.forEach(achievement => {
        if (!achievement.unlocked) {
            let progress = 0;
            if (achievement.type === 'clicks') progress = gameState.totalClicks;
            else if (achievement.type === 'points') progress = gameState.totalEarned;
            else if (achievement.type === 'upgrades') progress = gameState.upgradesBought;
            else if (achievement.type === 'level') progress = gameState.level;
            else if (achievement.type === 'combo') progress = gameState.bestCombo;
            else if (achievement.type === 'critical') progress = gameState.criticalHits;
            
            if (progress >= achievement.requirement) {
                achievement.unlocked = true;
                achievement.isNew = true;
                showAchievementModal(achievement);
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    });
}

function showAchievementModal(achievement) {
    document.getElementById('achievementPopupIcon').textContent = achievement.icon;
    document.getElementById('achievementPopupName').textContent = achievement.name;
    document.getElementById('achievementPopupReward').textContent = '+' + formatNumber(achievement.reward) + ' 💎';
    document.getElementById('achievementModal').classList.add('show');
    
    document.getElementById('claimAchievement').onclick = () => {
        if (!achievement.claimed) {
            gameState.points += achievement.reward;
            gameState.totalEarned += achievement.reward;
            achievement.claimed = true;
            achievement.isNew = false;
        }
        document.getElementById('achievementModal').classList.remove('show');
        updateUI();
        saveGame();
    };
}

function buyUpgrade(upgradeId) {
    const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    const cost = getUpgradeCost(upgrade);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        upgrade.level++;
        gameState.upgradesBought++;
        
        if (upgrade.profitType === 'click') gameState.pointsPerClick += upgrade.baseProfit;
        else if (upgrade.profitType === 'auto') gameState.pointsPerSecond += upgrade.baseProfit;
        else if (upgrade.profitType === 'energy') gameState.maxEnergy += upgrade.baseProfit;
        else if (upgrade.profitType === 'regen') gameState.energyRegenRate += upgrade.baseProfit;
        else if (upgrade.profitType === 'critical') gameState.criticalChance += upgrade.baseProfit;
        else if (upgrade.profitType === 'critMulti') gameState.criticalMultiplier += upgrade.baseProfit;
        
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
            gameState.energy = gameState.maxEnergy;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            booster.active = true;
            booster.endTime = Date.now() + booster.duration;
            
            if (booster.effect === 'multiplier') {
                gameState.multiplier *= booster.value;
            } else if (booster.effect === 'frenzy') {
                gameState.multiplier *= booster.value;
            } else if (booster.effect === 'autoMulti') {
                // Обрабатывается в генерации пассивного дохода
            }
            
            tg.HapticFeedback.notificationOccurred('success');
            setTimeout(() => deactivateBooster(boosterId), booster.duration);
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
    
    if (booster.effect === 'multiplier' || booster.effect === 'frenzy') {
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
    if (num < 1000000000000) return (num / 1000000000).toFixed(1) + 'B';
    return (num / 1000000000000).toFixed(1) + 'T';
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function updateUI() {
    document.getElementById('points').textContent = formatNumber(gameState.points);
    
    let autoMultiplier = 1;
    const autoBooster = gameState.boosters.find(b => b.id === 'auto_boost' && b.active);
    if (autoBooster) autoMultiplier = autoBooster.value;
    
    document.getElementById('pointsPerSecond').textContent = formatNumber(gameState.pointsPerSecond * gameState.multiplier * autoMultiplier);
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('multiplier').textContent = 'x' + gameState.multiplier.toFixed(1);
    document.getElementById('energy').textContent = Math.floor(gameState.energy) + '/' + gameState.maxEnergy;
    document.getElementById('energyFill').style.width = (gameState.energy / gameState.maxEnergy) * 100 + '%';
    
    const requiredExp = getRequiredExperience(gameState.level);
    document.getElementById('progressFill').style.width = (gameState.experience / requiredExp) * 100 + '%';
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
        document.getElementById('bonusTimer').textContent = formatTime(bonusInterval - timeSinceBonus);
        document.getElementById('bonusBtn').style.animation = 'pulse-bonus 2s ease-in-out infinite';
    }
}

document.getElementById('bonusBtn').addEventListener('click', () => {
    const now = Date.now();
    const timeSinceBonus = now - gameState.lastBonusTime;
    if (timeSinceBonus >= 60 * 60 * 1000) {
        showBonusModal();
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
});

function showBonusModal() {
    const bonusAmount = Math.floor(gameState.pointsPerSecond * 50 + gameState.level * 50);
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
        if (upgrade.profitType === 'click') profitText = `+${upgrade.baseProfit} за клик`;
        else if (upgrade.profitType === 'auto') profitText = `+${upgrade.baseProfit}/сек`;
        else if (upgrade.profitType === 'energy') profitText = `+${upgrade.baseProfit} энергии`;
        else if (upgrade.profitType === 'regen') profitText = `+${upgrade.baseProfit} реген`;
        else if (upgrade.profitType === 'critical') profitText = `+${(upgrade.baseProfit * 100).toFixed(0)}% крит`;
        else if (upgrade.profitType === 'critMulti') profitText = `+${upgrade.baseProfit}x урон`;
        
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
            <button class="upgrade-buy" ${!canAfford ? 'disabled' : ''} onclick="buyUpgrade('${upgrade.id}')">${formatNumber(cost)}</button>
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
        if (!booster.active && canAfford) item.onclick = () => activateBooster(booster.id);
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
            <div class="achievement-reward">+${formatNumber(achievement.reward)} 💎</div>
        `;
        if (achievement.isNew && !achievement.claimed) {
            item.onclick = () => showAchievementModal(achievement);
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
    document.getElementById('playTime').textContent = Math.floor((Date.now() - gameState.startTime) / 60000) + ' мин';
    
    const unlockedCount = gameState.achievements.filter(a => a.unlocked).length;
    document.getElementById('achievementsUnlocked').textContent = unlockedCount + '/' + gameState.achievements.length;
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
        let autoMultiplier = 1;
        const autoBooster = gameState.boosters.find(b => b.id === 'auto_boost' && b.active);
        if (autoBooster) autoMultiplier = autoBooster.value;
        
        const earned = (gameState.pointsPerSecond * gameState.multiplier * autoMultiplier) / 10;
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
        if (booster.active && Date.now() >= booster.endTime) deactivateBooster(booster.id);
    });
    updateBonusTimer();
}, 1000);

setInterval(() => saveGame(), 5000);

document.getElementById('bonusModal').addEventListener('click', (e) => {
    if (e.target.id === 'bonusModal') document.getElementById('bonusModal').classList.remove('show');
});

document.getElementById('achievementModal').addEventListener('click', (e) => {
    if (e.target.id === 'achievementModal') {
        document.getElementById('achievementModal').classList.remove('show');
    }
});

document.getElementById('levelUpModal').addEventListener('click', (e) => {
    if (e.target.id === 'levelUpModal') {
        document.getElementById('levelUpModal').classList.remove('show');
    }
});

loadGame();
updateUI();

tg.MainButton.text = "Сохранить прогресс";
tg.MainButton.onClick(() => {
    const data = { 
        action: 'save_progress', 
        points: Math.floor(gameState.points), 
        level: gameState.level, 
        totalClicks: gameState.totalClicks 
    };
    tg.sendData(JSON.stringify(data));
});

if (gameState.level > 1) tg.MainButton.show();

