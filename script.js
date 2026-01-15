const GAME_VERSION = '4.0';
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

function getUserIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('uid') || null;
}

const USER_ID = getUserIdFromURL();

let gameState = {
    userId: USER_ID,
    coins: 0,
    gems: 0,
    totalEarned: 0,
    totalClicks: 0,
    coinsPerClick: 1,
    coinsPerSecond: 0,
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
    clickCooldown: 150,
    theme: 'dark',
    gemDropChance: 0.01,
    gemsFound: 0,
    luck: 0,
    prestigePoints: 0,
    shopItems: []
};

const upgradeDefinitions = [
    // Улучшения клика
    { id: 'cursor1', name: 'Магический курсор', icon: '👆', description: 'Увеличивает силу клика', baseCost: 10, baseProfit: 1, profitType: 'click', costMultiplier: 1.15 },
    { id: 'cursor2', name: 'Усиленный курсор', icon: '✨', description: 'Еще больше силы клика', baseCost: 50, baseProfit: 3, profitType: 'click', costMultiplier: 1.16 },
    { id: 'cursor3', name: 'Мощный курсор', icon: '💫', description: 'Огромная сила клика', baseCost: 250, baseProfit: 10, profitType: 'click', costMultiplier: 1.17 },
    { id: 'cursor4', name: 'Божественный курсор', icon: '⚡', description: 'Невероятная сила', baseCost: 1200, baseProfit: 40, profitType: 'click', costMultiplier: 1.18 },
    { id: 'cursor5', name: 'Космический курсор', icon: '🌟', description: 'Абсолютная сила', baseCost: 6000, baseProfit: 150, profitType: 'click', costMultiplier: 1.19 },
    
    // Энергия
    { id: 'energy1', name: 'Кристалл энергии', icon: '🔋', description: '+20 макс. энергии', baseCost: 30, baseProfit: 20, profitType: 'energy', costMultiplier: 1.2 },
    { id: 'energy2', name: 'Энергетический усилитель', icon: '⚡', description: '+50 макс. энергии', baseCost: 200, baseProfit: 50, profitType: 'energy', costMultiplier: 1.22 },
    { id: 'energy3', name: 'Реактор энергии', icon: '🔆', description: '+100 макс. энергии', baseCost: 1000, baseProfit: 100, profitType: 'energy', costMultiplier: 1.24 },
    { id: 'regen1', name: 'Регенерация I', icon: '♻️', description: '+1 реген/сек', baseCost: 100, baseProfit: 1, profitType: 'regen', costMultiplier: 1.25 },
    { id: 'regen2', name: 'Регенерация II', icon: '🌀', description: '+2 реген/сек', baseCost: 500, baseProfit: 2, profitType: 'regen', costMultiplier: 1.27 },
    { id: 'regen3', name: 'Регенерация III', icon: '💠', description: '+5 реген/сек', baseCost: 2500, baseProfit: 5, profitType: 'regen', costMultiplier: 1.29 },
    
    // Криты
    { id: 'crit1', name: 'Око удачи', icon: '🎯', description: '+2% шанс крита', baseCost: 150, baseProfit: 0.02, profitType: 'critical', costMultiplier: 1.3 },
    { id: 'crit2', name: 'Божественная меткость', icon: '🎲', description: '+3% шанс крита', baseCost: 800, baseProfit: 0.03, profitType: 'critical', costMultiplier: 1.32 },
    { id: 'crit3', name: 'Абсолютная точность', icon: '🍀', description: '+5% шанс крита', baseCost: 4000, baseProfit: 0.05, profitType: 'critical', costMultiplier: 1.34 },
    { id: 'critMulti1', name: 'Критическая сила I', icon: '💥', description: '+1x крит урон', baseCost: 1000, baseProfit: 1, profitType: 'critMulti', costMultiplier: 1.4 },
    { id: 'critMulti2', name: 'Критическая сила II', icon: '💢', description: '+2x крит урон', baseCost: 5000, baseProfit: 2, profitType: 'critMulti', costMultiplier: 1.45 },
    
    // Удача (шанс дропа гемов)
    { id: 'luck1', name: 'Четырехлистный клевер', icon: '🍀', description: '+1% удача', baseCost: 500, baseProfit: 0.01, profitType: 'luck', costMultiplier: 1.35 },
    { id: 'luck2', name: 'Амулет удачи', icon: '🎰', description: '+2% удача', baseCost: 2500, baseProfit: 0.02, profitType: 'luck', costMultiplier: 1.38 },
    { id: 'luck3', name: 'Благословение фортуны', icon: '🌈', description: '+5% удача', baseCost: 12000, baseProfit: 0.05, profitType: 'luck', costMultiplier: 1.42 },
    
    // Пассивный доход
    { id: 'auto1', name: 'Младший маг', icon: '🧙', description: 'Генерирует 1/сек', baseCost: 50, baseProfit: 1, profitType: 'auto', costMultiplier: 1.18 },
    { id: 'auto2', name: 'Кристальная шахта', icon: '⛏️', description: 'Генерирует 5/сек', baseCost: 250, baseProfit: 5, profitType: 'auto', costMultiplier: 1.2 },
    { id: 'auto3', name: 'Портал энергии', icon: '🌀', description: 'Генерирует 20/сек', baseCost: 1200, baseProfit: 20, profitType: 'auto', costMultiplier: 1.22 },
    { id: 'auto4', name: 'Древний храм', icon: '🏛️', description: 'Генерирует 80/сек', baseCost: 6000, baseProfit: 80, profitType: 'auto', costMultiplier: 1.24 },
    { id: 'auto5', name: 'Космический генератор', icon: '🛸', description: 'Генерирует 320/сек', baseCost: 30000, baseProfit: 320, profitType: 'auto', costMultiplier: 1.26 },
    { id: 'auto6', name: 'Черная дыра', icon: '🌑', description: 'Генерирует 1200/сек', baseCost: 150000, baseProfit: 1200, profitType: 'auto', costMultiplier: 1.28 },
    { id: 'auto7', name: 'Временной разлом', icon: '⏰', description: 'Генерирует 5000/сек', baseCost: 750000, baseProfit: 5000, profitType: 'auto', costMultiplier: 1.3 },
    { id: 'auto8', name: 'Измерение бесконечности', icon: '♾️', description: 'Генерирует 20000/сек', baseCost: 3750000, baseProfit: 20000, profitType: 'auto', costMultiplier: 1.32 },
    { id: 'auto9', name: 'Квантовый реактор', icon: '⚛️', description: 'Генерирует 80000/сек', baseCost: 18000000, baseProfit: 80000, profitType: 'auto', costMultiplier: 1.34 },
    { id: 'auto10', name: 'Вселенская фабрика', icon: '🌌', description: 'Генерирует 320000/сек', baseCost: 90000000, baseProfit: 320000, profitType: 'auto', costMultiplier: 1.36 }
];

const boosterDefinitions = [
    { id: 'double', name: 'Двойной удар', icon: '⚔️', description: 'x2 очков за клик 30 сек', cost: 5, duration: 30000, effect: 'multiplier', value: 2 },
    { id: 'triple', name: 'Тройная сила', icon: '🔱', description: 'x3 очков за клик 30 сек', cost: 15, duration: 30000, effect: 'multiplier', value: 3 },
    { id: 'mega', name: 'Мега усиление', icon: '⭐', description: 'x5 очков за клик 25 сек', cost: 40, duration: 25000, effect: 'multiplier', value: 5 },
    { id: 'ultra', name: 'Ультра сила', icon: '💎', description: 'x10 очков за клик 20 сек', cost: 100, duration: 20000, effect: 'multiplier', value: 10 },
    { id: 'frenzy', name: 'Безумие', icon: '💥', description: 'x20 всех доходов 15 сек', cost: 250, duration: 15000, effect: 'frenzy', value: 20 },
    { id: 'supernova', name: 'Супернова', icon: '🌟', description: 'x50 всех доходов 10 сек', cost: 500, duration: 10000, effect: 'frenzy', value: 50 },
    { id: 'energy_boost', name: 'Энергетический взрыв', icon: '⚡', description: 'Полная энергия', cost: 3, duration: 0, effect: 'energy', value: 100 },
    { id: 'auto_boost', name: 'Турбо режим', icon: '🚀', description: 'x5 пассивного дохода 60 сек', cost: 80, duration: 60000, effect: 'autoMulti', value: 5 },
    { id: 'luck_boost', name: 'Удача драконов', icon: '🐉', description: 'x10 удача 30 сек', cost: 120, duration: 30000, effect: 'luckMulti', value: 10 },
    { id: 'godmode', name: 'Режим бога', icon: '👑', description: 'x100 всего 5 сек!', cost: 1000, duration: 5000, effect: 'godmode', value: 100 }
];

const shopDefinitions = [
    { id: 'gem_pack_1', name: 'Малый пакет гемов', icon: '💎', description: '10 гемов', cost: 100, reward: 10, type: 'gems' },
    { id: 'gem_pack_2', name: 'Средний пакет гемов', icon: '💎', description: '50 гемов', cost: 450, reward: 50, type: 'gems' },
    { id: 'gem_pack_3', name: 'Большой пакет гемов', icon: '💎', description: '150 гемов', cost: 1200, reward: 150, type: 'gems' },
    { id: 'gem_pack_4', name: 'Огромный пакет гемов', icon: '💎', description: '500 гемов', cost: 3500, reward: 500, type: 'gems' },
    { id: 'gem_pack_5', name: 'Легендарный пакет', icon: '💎', description: '2000 гемов', cost: 12000, reward: 2000, type: 'gems' },
    { id: 'prestige_boost', name: 'Ускоритель престижа', icon: '✨', description: '+10% к престижным очкам', cost: 100, reward: 0.1, type: 'prestige_multi', permanent: true }
];

const achievementDefinitions = [
    // Клики
    { id: 'clicks_10', icon: '👆', name: 'Новичок', description: '10 кликов', requirement: 10, type: 'clicks', coinReward: 10, gemReward: 1 },
    { id: 'clicks_50', icon: '👍', name: 'Активный', description: '50 кликов', requirement: 50, type: 'clicks', coinReward: 50, gemReward: 2 },
    { id: 'clicks_100', icon: '✨', name: 'Кликер', description: '100 кликов', requirement: 100, type: 'clicks', coinReward: 100, gemReward: 3 },
    { id: 'clicks_500', icon: '💪', name: 'Профи', description: '500 кликов', requirement: 500, type: 'clicks', coinReward: 500, gemReward: 5 },
    { id: 'clicks_1000', icon: '⚡', name: 'Мастер', description: '1000 кликов', requirement: 1000, type: 'clicks', coinReward: 1000, gemReward: 10 },
    { id: 'clicks_5000', icon: '🔥', name: 'Эксперт', description: '5000 кликов', requirement: 5000, type: 'clicks', coinReward: 5000, gemReward: 25 },
    { id: 'clicks_10000', icon: '🌟', name: 'Легенда', description: '10000 кликов', requirement: 10000, type: 'clicks', coinReward: 10000, gemReward: 50 },
    { id: 'clicks_50000', icon: '💫', name: 'Титан', description: '50000 кликов', requirement: 50000, type: 'clicks', coinReward: 50000, gemReward: 100 },
    
    // Монеты
    { id: 'coins_100', icon: '💰', name: 'Первые деньги', description: '100 монет', requirement: 100, type: 'coins', coinReward: 50, gemReward: 2 },
    { id: 'coins_1000', icon: '💵', name: 'Тысячник', description: '1000 монет', requirement: 1000, type: 'coins', coinReward: 500, gemReward: 5 },
    { id: 'coins_10000', icon: '💸', name: 'Богач', description: '10000 монет', requirement: 10000, type: 'coins', coinReward: 5000, gemReward: 15 },
    { id: 'coins_100000', icon: '👑', name: 'Магнат', description: '100000 монет', requirement: 100000, type: 'coins', coinReward: 50000, gemReward: 50 },
    { id: 'coins_1000000', icon: '🏆', name: 'Миллионер', description: '1000000 монет', requirement: 1000000, type: 'coins', coinReward: 500000, gemReward: 150 },
    
    // Уровни
    { id: 'level_5', icon: '⭐', name: 'Звезда', description: 'Уровень 5', requirement: 5, type: 'level', coinReward: 200, gemReward: 5 },
    { id: 'level_10', icon: '💫', name: 'Супер звезда', description: 'Уровень 10', requirement: 10, type: 'level', coinReward: 500, gemReward: 10 },
    { id: 'level_20', icon: '🌠', name: 'Сияние', description: 'Уровень 20', requirement: 20, type: 'level', coinReward: 1500, gemReward: 20 },
    { id: 'level_30', icon: '✨', name: 'Небесный', description: 'Уровень 30', requirement: 30, type: 'level', coinReward: 4000, gemReward: 35 },
    { id: 'level_50', icon: '🌌', name: 'Космический', description: 'Уровень 50', requirement: 50, type: 'level', coinReward: 12000, gemReward: 60 },
    { id: 'level_75', icon: '🔮', name: 'Магический', description: 'Уровень 75', requirement: 75, type: 'level', coinReward: 30000, gemReward: 100 },
    { id: 'level_100', icon: '👑', name: 'Владыка', description: 'Уровень 100', requirement: 100, type: 'level', coinReward: 100000, gemReward: 200 },
    
    // Улучшения
    { id: 'upgrades_5', icon: '🎯', name: 'Улучшатель', description: '5 улучшений', requirement: 5, type: 'upgrades', coinReward: 100, gemReward: 3 },
    { id: 'upgrades_10', icon: '🎪', name: 'Коллекционер', description: '10 улучшений', requirement: 10, type: 'upgrades', coinReward: 300, gemReward: 7 },
    { id: 'upgrades_25', icon: '🚀', name: 'Энтузиаст', description: '25 улучшений', requirement: 25, type: 'upgrades', coinReward: 1000, gemReward: 15 },
    { id: 'upgrades_50', icon: '🌈', name: 'Мастер улучшений', description: '50 улучшений', requirement: 50, type: 'upgrades', coinReward: 5000, gemReward: 35 },
    { id: 'upgrades_100', icon: '💎', name: 'Перфекционист', description: '100 улучшений', requirement: 100, type: 'upgrades', coinReward: 20000, gemReward: 80 },
    
    // Гемы
    { id: 'gems_10', icon: '💎', name: 'Первые гемы', description: '10 гемов', requirement: 10, type: 'gems', coinReward: 500, gemReward: 5 },
    { id: 'gems_50', icon: '💎', name: 'Коллектор гемов', description: '50 гемов', requirement: 50, type: 'gems', coinReward: 2500, gemReward: 15 },
    { id: 'gems_100', icon: '💎', name: 'Хранитель гемов', description: '100 гемов', requirement: 100, type: 'gems', coinReward: 10000, gemReward: 30 },
    { id: 'gems_500', icon: '💎', name: 'Владыка гемов', description: '500 гемов', requirement: 500, type: 'gems', coinReward: 50000, gemReward: 100 },
    
    // Комбо
    { id: 'combo_10', icon: '🔥', name: 'Горячие руки', description: 'Комбо x10', requirement: 10, type: 'combo', coinReward: 200, gemReward: 3 },
    { id: 'combo_25', icon: '⚡', name: 'Скоростной', description: 'Комбо x25', requirement: 25, type: 'combo', coinReward: 600, gemReward: 7 },
    { id: 'combo_50', icon: '💥', name: 'Безумие', description: 'Комбо x50', requirement: 50, type: 'combo', coinReward: 1500, gemReward: 15 },
    { id: 'combo_100', icon: '🌪️', name: 'Ураган', description: 'Комбо x100', requirement: 100, type: 'combo', coinReward: 5000, gemReward: 35 },
    { id: 'combo_250', icon: '🌀', name: 'Торнадо', description: 'Комбо x250', requirement: 250, type: 'combo', coinReward: 15000, gemReward: 75 },
    
    // Криты
    { id: 'critical_50', icon: '🎯', name: 'Снайпер', description: '50 критов', requirement: 50, type: 'critical', coinReward: 500, gemReward: 5 },
    { id: 'critical_250', icon: '🎲', name: 'Везунчик', description: '250 критов', requirement: 250, type: 'critical', coinReward: 2500, gemReward: 15 },
    { id: 'critical_1000', icon: '🍀', name: 'Удачливый', description: '1000 критов', requirement: 1000, type: 'critical', coinReward: 10000, gemReward: 40 },
    { id: 'critical_5000', icon: '✨', name: 'Мастер критов', description: '5000 критов', requirement: 5000, type: 'critical', coinReward: 50000, gemReward: 100 }
];

const themes = {
    1: 'dark', 10: 'ocean', 20: 'forest', 30: 'fire', 40: 'cosmic', 50: 'gold',
    60: 'ice', 70: 'nature', 80: 'sunset', 90: 'electric', 100: 'blood',
    120: 'shadow', 140: 'neon', 160: 'earth', 180: 'sky'
};
function initializeGame() {
    initializeUpgrades();
    initializeAchievements();
    initializeBoosters();
    initializeShop();
    
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

function initializeShop() {
    gameState.shopItems = shopDefinitions.map(def => ({ ...def, purchased: 0 }));
}

function loadGame() {
    const saved = localStorage.getItem('darkClickerSave_' + USER_ID);
    if (saved) {
        const savedState = JSON.parse(saved);
        gameState = { ...gameState, ...savedState };
        initializeUpgrades();
        initializeAchievements();
        initializeBoosters();
        initializeShop();
        
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
        if (savedState.shopItems) {
            savedState.shopItems.forEach((savedItem, index) => {
                if (gameState.shopItems[index]) {
                    gameState.shopItems[index].purchased = savedItem.purchased;
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
    gameState.coinsPerClick = 1;
    gameState.coinsPerSecond = 0;
    gameState.maxEnergy = 100;
    gameState.energyRegenRate = 1;
    gameState.criticalChance = 0.05;
    gameState.criticalMultiplier = 2;
    gameState.luck = 0;
    gameState.gemDropChance = 0.01;
    
    gameState.upgrades.forEach(upgrade => {
        for (let i = 0; i < upgrade.level; i++) {
            if (upgrade.profitType === 'click') gameState.coinsPerClick += upgrade.baseProfit;
            else if (upgrade.profitType === 'auto') gameState.coinsPerSecond += upgrade.baseProfit;
            else if (upgrade.profitType === 'energy') gameState.maxEnergy += upgrade.baseProfit;
            else if (upgrade.profitType === 'regen') gameState.energyRegenRate += upgrade.baseProfit;
            else if (upgrade.profitType === 'critical') gameState.criticalChance += upgrade.baseProfit;
            else if (upgrade.profitType === 'critMulti') gameState.criticalMultiplier += upgrade.baseProfit;
            else if (upgrade.profitType === 'luck') gameState.luck += upgrade.baseProfit;
        }
    });
    
    gameState.gemDropChance += gameState.luck;
    
    // Престиж бонус
    const prestigeBonus = 1 + (gameState.prestigePoints * 0.1);
    gameState.coinsPerClick = Math.floor(gameState.coinsPerClick * prestigeBonus);
    gameState.coinsPerSecond = Math.floor(gameState.coinsPerSecond * prestigeBonus);
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
    localStorage.setItem('darkClickerSave_' + USER_ID, JSON.stringify(gameState));
}

function syncWithServer() {
    if (!USER_ID) return;
    
    const data = {
        action: 'save_progress',
        coins: Math.floor(gameState.coins),
        gems: Math.floor(gameState.gems),
        level: gameState.level,
        totalClicks: gameState.totalClicks,
        totalEarned: Math.floor(gameState.totalEarned),
        gameState: gameState
    };
    
    tg.sendData(JSON.stringify(data));
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
    let coins = gameState.coinsPerClick * gameState.multiplier;
    
    // Проверка на активный godmode
    const godmode = gameState.boosters.find(b => b.id === 'godmode' && b.active);
    if (godmode) {
        coins *= godmode.value;
    }
    
    if (isCritical) {
        coins *= gameState.criticalMultiplier;
        gameState.criticalHits++;
        document.getElementById('crystalButton').classList.add('critical');
        setTimeout(() => document.getElementById('crystalButton').classList.remove('critical'), 500);
        tg.HapticFeedback.impactOccurred('heavy');
    } else {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    gameState.coins += coins;
    gameState.totalEarned += coins;
    gameState.totalClicks++;
    gameState.experience += coins;
    
    // Шанс дропа гема
    const luckBooster = gameState.boosters.find(b => b.id === 'luck_boost' && b.active);
    let gemChance = gameState.gemDropChance;
    if (luckBooster) gemChance *= luckBooster.value;
    
    if (Math.random() < gemChance) {
        const gemDrop = Math.floor(Math.random() * 3) + 1;
        gameState.gems += gemDrop;
        gameState.gemsFound += gemDrop;
        showGemDrop(gemDrop);
        tg.HapticFeedback.notificationOccurred('success');
    }
    
    updateCombo();
    showClickIndicator(e.pageX, e.pageY, coins, isCritical);
    checkLevelUp();
    checkAchievements();
    updateUI();
    saveGame();
});

function showGemDrop(amount) {
    document.getElementById('gemDropAmount').textContent = '+' + amount + ' ' + (amount === 1 ? 'Гем' : 'Гема');
    document.getElementById('gemDropModal').classList.add('show');
    
    setTimeout(() => {
        document.getElementById('gemDropModal').classList.remove('show');
    }, 2000);
}

document.getElementById('closeGemDrop').addEventListener('click', () => {
    document.getElementById('gemDropModal').classList.remove('show');
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

function showClickIndicator(x, y, coins, isCritical) {
    const indicator = document.getElementById('clickIndicator');
    indicator.textContent = `+${formatNumber(coins)}`;
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
        
        const coinReward = gameState.level * 100;
        const gemReward = Math.floor(gameState.level / 5);
        
        gameState.coins += coinReward;
        gameState.gems += gemReward;
        gameState.totalEarned += coinReward;
        
        showLevelUpModal(gameState.level, coinReward, gemReward);
        updateTheme();
        tg.HapticFeedback.notificationOccurred('success');
        checkAchievements();
    }
}

function getRequiredExperience(level) {
    return Math.floor(100 * Math.pow(1.35, level - 1));
}

function showLevelUpModal(level, coinReward, gemReward) {
    document.getElementById('levelUpNumber').textContent = level;
    document.getElementById('levelUpCoins').textContent = '+' + formatNumber(coinReward) + ' 💰';
    document.getElementById('levelUpGems').textContent = '+' + gemReward + ' 💎';
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
            else if (achievement.type === 'coins') progress = gameState.totalEarned;
            else if (achievement.type === 'upgrades') progress = gameState.upgradesBought;
            else if (achievement.type === 'level') progress = gameState.level;
            else if (achievement.type === 'combo') progress = gameState.bestCombo;
            else if (achievement.type === 'critical') progress = gameState.criticalHits;
            else if (achievement.type === 'gems') progress = gameState.gemsFound;
            
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
    document.getElementById('achievementPopupCoins').textContent = '+' + formatNumber(achievement.coinReward) + ' 💰';
    document.getElementById('achievementPopupGems').textContent = '+' + achievement.gemReward + ' 💎';
    document.getElementById('achievementModal').classList.add('show');
    
    document.getElementById('claimAchievement').onclick = () => {
        if (!achievement.claimed) {
            gameState.coins += achievement.coinReward;
            gameState.gems += achievement.gemReward;
            gameState.totalEarned += achievement.coinReward;
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
    if (gameState.coins >= cost) {
        gameState.coins -= cost;
        upgrade.level++;
        gameState.upgradesBought++;
        
        if (upgrade.profitType === 'click') gameState.coinsPerClick += upgrade.baseProfit;
        else if (upgrade.profitType === 'auto') gameState.coinsPerSecond += upgrade.baseProfit;
        else if (upgrade.profitType === 'energy') gameState.maxEnergy += upgrade.baseProfit;
        else if (upgrade.profitType === 'regen') gameState.energyRegenRate += upgrade.baseProfit;
        else if (upgrade.profitType === 'critical') gameState.criticalChance += upgrade.baseProfit;
        else if (upgrade.profitType === 'critMulti') gameState.criticalMultiplier += upgrade.baseProfit;
        else if (upgrade.profitType === 'luck') {
            gameState.luck += upgrade.baseProfit;
            gameState.gemDropChance += upgrade.baseProfit;
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
    if (gameState.gems >= booster.cost) {
        gameState.gems -= booster.cost;
        if (booster.effect === 'energy') {
            gameState.energy = gameState.maxEnergy;
            tg.HapticFeedback.notificationOccurred('success');
        } else {
            booster.active = true;
            booster.endTime = Date.now() + booster.duration;
            
            if (booster.effect === 'multiplier') {
                gameState.multiplier *= booster.value;
            } else if (booster.effect === 'frenzy' || booster.effect === 'godmode') {
                gameState.multiplier *= booster.value;
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
    
    if (booster.effect === 'multiplier' || booster.effect === 'frenzy' || booster.effect === 'godmode') {
        gameState.multiplier /= booster.value;
    }
    
    booster.active = false;
    booster.endTime = 0;
    updateUI();
}

function buyShopItem(itemId) {
    const item = gameState.shopItems.find(i => i.id === itemId);
    if (!item) return;
    
    if (gameState.coins >= item.cost) {
        gameState.coins -= item.cost;
        
        if (item.type === 'gems') {
            gameState.gems += item.reward;
        } else if (item.type === 'prestige_multi') {
            if (!item.purchased) {
                item.purchased = 1;
            }
        }
        
        tg.HapticFeedback.impactOccurred('medium');
        updateUI();
        saveGame();
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
}

function doPrestige() {
    if (gameState.level < 10) {
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }
    
    const prestigeGain = Math.floor(gameState.level / 10);
    
    if (confirm(`Сбросить прогресс за ${prestigeGain} престижных очков?`)) {
        gameState.prestigePoints += prestigeGain;
        
        // Сброс
        gameState.coins = 0;
        gameState.level = 1;
        gameState.experience = 0;
        gameState.totalClicks = 0;
        gameState.totalEarned = 0;
        gameState.criticalHits = 0;
        gameState.bestCombo = 0;
        gameState.upgradesBought = 0;
        gameState.gemsFound = 0;
        
        initializeUpgrades();
        
        tg.HapticFeedback.notificationOccurred('success');
        recalculateStats();
        updateTheme();
        updateUI();
        saveGame();
    }
}

document.getElementById('prestigeBtn').addEventListener('click', doPrestige);

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
    document.getElementById('coins').textContent = formatNumber(gameState.coins);
    document.getElementById('gems').textContent = Math.floor(gameState.gems);
    
    let autoMultiplier = 1;
    const autoBooster = gameState.boosters.find(b => b.id === 'auto_boost' && b.active);
    if (autoBooster) autoMultiplier = autoBooster.value;
    
    const godmode = gameState.boosters.find(b => b.id === 'godmode' && b.active);
    if (godmode) autoMultiplier *= godmode.value;
    
    document.getElementById('coinsPerSecond').textContent = formatNumber(gameState.coinsPerSecond * gameState.multiplier * autoMultiplier);
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('multiplier').textContent = 'x' + gameState.multiplier.toFixed(1);
    document.getElementById('energy').textContent = Math.floor(gameState.energy) + '/' + gameState.maxEnergy;
    document.getElementById('energyFill').style.width = (gameState.energy / gameState.maxEnergy) * 100 + '%';
    document.getElementById('luckValue').textContent = (gameState.gemDropChance * 100).toFixed(1) + '%';
    
    const requiredExp = getRequiredExperience(gameState.level);
    document.getElementById('progressFill').style.width = (gameState.experience / requiredExp) * 100 + '%';
    document.getElementById('currentProgress').textContent = formatNumber(gameState.experience);
    document.getElementById('nextLevelRequirement').textContent = formatNumber(requiredExp);
    
    // Престиж
    const prestigeGain = Math.floor(gameState.level / 10);
    const prestigeBonus = gameState.prestigePoints * 10;
    document.getElementById('prestigePoints').textContent = gameState.prestigePoints;
    document.getElementById('prestigeGain').textContent = prestigeGain;
    document.getElementById('prestigeBonus').textContent = '+' + prestigeBonus + '%';
    
    updateBonusTimer();
    renderUpgrades();
    renderBoosters();
    renderShop();
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
    const coinBonus = Math.floor(gameState.coinsPerSecond * 100 + gameState.level * 100);
    const gemBonus = Math.floor(gameState.level / 5) + 5;
    
    document.getElementById('bonusCoins').textContent = '+' + formatNumber(coinBonus) + ' 💰';
    document.getElementById('bonusGems').textContent = '+' + gemBonus + ' 💎';
    document.getElementById('bonusModal').classList.add('show');
    
    document.getElementById('claimBonus').onclick = () => {
        gameState.coins += coinBonus;
        gameState.gems += gemBonus;
        gameState.totalEarned += coinBonus;
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
        const canAfford = gameState.coins >= cost;
        const item = document.createElement('div');
        item.className = `upgrade-item ${canAfford ? 'affordable' : ''}`;
        
        let profitText = '';
        if (upgrade.profitType === 'click') profitText = `+${upgrade.baseProfit} за клик`;
        else if (upgrade.profitType === 'auto') profitText = `+${upgrade.baseProfit}/сек`;
        else if (upgrade.profitType === 'energy') profitText = `+${upgrade.baseProfit} энергии`;
        else if (upgrade.profitType === 'regen') profitText = `+${upgrade.baseProfit} реген`;
        else if (upgrade.profitType === 'critical') profitText = `+${(upgrade.baseProfit * 100).toFixed(0)}% крит`;
        else if (upgrade.profitType === 'critMulti') profitText = `+${upgrade.baseProfit}x урон`;
        else if (upgrade.profitType === 'luck') profitText = `+${(upgrade.baseProfit * 100).toFixed(0)}% удача`;
        
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
            <button class="upgrade-buy" ${!canAfford ? 'disabled' : ''} onclick="buyUpgrade('${upgrade.id}')">${formatNumber(cost)} 💰</button>
        `;
        container.appendChild(item);
    });
}

function renderBoosters() {
    const container = document.getElementById('boostersList');
    container.innerHTML = '';
    gameState.boosters.forEach(booster => {
        const canAfford = gameState.gems >= booster.cost;
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
            <div class="booster-cost">${booster.cost} 💎</div>
            ${timerHTML}
        `;
        if (!booster.active && canAfford) item.onclick = () => activateBooster(booster.id);
        container.appendChild(item);
    });
}

function renderShop() {
    const container = document.getElementById('shopList');
    container.innerHTML = '';
    gameState.shopItems.forEach(item => {
        const canAfford = gameState.coins >= item.cost;
        const shopElement = document.createElement('div');
        shopElement.className = `shop-item gem-item`;
        
        shopElement.innerHTML = `
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-info">
                <div class="shop-name">${item.name}</div>
                <div class="shop-description">${item.description}</div>
            </div>
            <button class="shop-buy" ${!canAfford ? 'disabled' : ''} onclick="buyShopItem('${item.id}')">${formatNumber(item.cost)} 💰</button>
        `;
        container.appendChild(shopElement);
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
            <div class="achievement-reward">${formatNumber(achievement.coinReward)}💰 + ${achievement.gemReward}💎</div>
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
    document.getElementById('gemsFound').textContent = formatNumber(gameState.gemsFound);
    
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
    if (gameState.coinsPerSecond > 0) {
        let autoMultiplier = 1;
        const autoBooster = gameState.boosters.find(b => b.id === 'auto_boost' && b.active);
        if (autoBooster) autoMultiplier = autoBooster.value;
        
        const godmode = gameState.boosters.find(b => b.id === 'godmode' && b.active);
        if (godmode) autoMultiplier *= godmode.value;
        
        const earned = (gameState.coinsPerSecond * gameState.multiplier * autoMultiplier) / 10;
        gameState.coins += earned;
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
setInterval(() => syncWithServer(), 30000);

document.getElementById('bonusModal').addEventListener('click', (e) => {
    if (e.target.id === 'bonusModal') document.getElementById('bonusModal').classList.remove('show');
});

document.getElementById('achievementModal').addEventListener('click', (e) => {
    if (e.target.id === 'achievementModal') document.getElementById('achievementModal').classList.remove('show');
});

document.getElementById('levelUpModal').addEventListener('click', (e) => {
    if (e.target.id === 'levelUpModal') document.getElementById('levelUpModal').classList.remove('show');
});

loadGame();
updateUI();

tg.MainButton.text = "💾 Сохранить в облако";
tg.MainButton.onClick(() => syncWithServer());
if (gameState.level > 1) tg.MainButton.show();
