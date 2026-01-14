// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

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
    startTime: Date.now(),
    upgradesBought: 0
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

// Определение достижений
const achievementDefinitions = [
    { id: 'clicks_10', icon: '👆', name: 'Новичок', description: '10 кликов', requirement: 10, type: 'clicks' },
    { id: 'clicks_100', icon: '✨', name: 'Кликер', description: '100 кликов', requirement: 100, type: 'clicks' },
    { id: 'clicks_1000', icon: '⚡', name: 'Мастер', description: '1000 кликов', requirement: 1000, type: 'clicks' },
    { id: 'points_100', icon: '💎', name: 'Богач', description: '100 очков', requirement: 100, type: 'points' },
    { id: 'points_1000', icon: '💰', name: 'Магнат', description: '1000 очков', requirement: 1000, type: 'points' },
    { id: 'points_10000', icon: '👑', name: 'Король', description: '10000 очков', requirement: 10000, type: 'points' },
    { id: 'upgrades_5', icon: '🎯', name: 'Улучшатель', description: '5 улучшений', requirement: 5, type: 'upgrades' },
    { id: 'upgrades_15', icon: '🚀', name: 'Коллекционер', description: '15 улучшений', requirement: 15, type: 'upgrades' },
    { id: 'level_5', icon: '⭐', name: 'Звезда', description: 'Уровень 5', requirement: 5, type: 'level' }
];

// Инициализация улучшений
function initializeUpgrades() {
    gameState.upgrades = upgradeDefinitions.map(def => ({
        ...def,
        level: 0
    }));
}

// Инициализация достижений
function initializeAchievements() {
    gameState.achievements = achievementDefinitions.map(def => ({
        ...def,
        unlocked: false
    }));
}

// Загрузка сохранения
function loadGame() {
    const saved = localStorage.getItem('darkClickerSave');
    if (saved) {
        const savedState = JSON.parse(saved);
        gameState = { ...gameState, ...savedState };
    } else {
        initializeUpgrades();
        initializeAchievements();
    }
    
    // Установка имени пользователя из Telegram
    if (tg.initDataUnsafe.user) {
        document.getElementById('username').textContent = tg.initDataUnsafe.user.first_name;
    }
}

// Сохранение игры
function saveGame() {
    localStorage.setItem('darkClickerSave', JSON.stringify(gameState));
}

// Обработка клика по кристаллу
document.getElementById('crystalButton').addEventListener('click', (e) => {
    const points = gameState.pointsPerClick;
    gameState.points += points;
    gameState.totalEarned += points;
    gameState.totalClicks++;
    gameState.experience += points;
    
    // Анимация индикатора
    showClickIndicator(e.pageX, e.pageY, points);
    
    // Проверка уровня
    checkLevelUp();
    
    // Проверка достижений
    checkAchievements();
    
    // Обновление UI
    updateUI();
    saveGame();
});

// Показ индикатора клика
function showClickIndicator(x, y, points) {
    const indicator = document.getElementById('clickIndicator');
    indicator.textContent = `+${formatNumber(points)}`;
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
    indicator.classList.remove('show');
    void indicator.offsetWidth; // Trigger reflow
    indicator.classList.add('show');
    
    setTimeout(() => {
        indicator.classList.remove('show');
    }, 800);
}

// Проверка повышения уровня
function checkLevelUp() {
    const requiredExp = getRequiredExperience(gameState.level);
    if (gameState.experience >= requiredExp) {
        gameState.level++;
        gameState.experience -= requiredExp;
        showLevelUpAnimation();
    }
}

// Получение необходимого опыта для уровня
function getRequiredExperience(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Анимация повышения уровня
function showLevelUpAnimation() {
    tg.HapticFeedback.notificationOccurred('success');
    // Можно добавить дополнительную анимацию
}

// Проверка достижений
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
            }
            
            if (progress >= achievement.requirement) {
                achievement.unlocked = true;
                tg.HapticFeedback.notificationOccurred('success');
            }
        }
    });
}

// Покупка улучшения
function buyUpgrade(upgradeId) {
    const upgrade = gameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;
    
    const cost = getUpgradeCost(upgrade);
    if (gameState.points >= cost) {
        gameState.points -= cost;
        upgrade.level++;
        gameState.upgradesBought++;
        
        // Обновление характеристик
        if (upgrade.profitType === 'click') {
            gameState.pointsPerClick += upgrade.baseProfit;
        } else {
            gameState.pointsPerSecond += upgrade.baseProfit;
        }
        
        tg.HapticFeedback.impactOccurred('medium');
        checkAchievements();
        updateUI();
        saveGame();
    }
}

// Получение стоимости улучшения
function getUpgradeCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

// Форматирование чисел
function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
}

// Обновление UI
function updateUI() {
    // Обновление статистики
    document.getElementById('points').textContent = formatNumber(gameState.points);
    document.getElementById('pointsPerSecond').textContent = formatNumber(gameState.pointsPerSecond);
    document.getElementById('level').textContent = gameState.level;
    
    // Обновление прогресс бара
    const requiredExp = getRequiredExperience(gameState.level);
    const progress = (gameState.experience / requiredExp) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('currentProgress').textContent = formatNumber(gameState.experience);
    document.getElementById('nextLevelRequirement').textContent = formatNumber(requiredExp);
    
    // Обновление улучшений
    renderUpgrades();
    
    // Обновление достижений
    renderAchievements();
    
    // Обновление статистики
    updateStats();
}

// Рендер улучшений
function renderUpgrades() {
    const container = document.getElementById('upgradesList');
    container.innerHTML = '';
    
    gameState.upgrades.forEach(upgrade => {
        const cost = getUpgradeCost(upgrade);
        const canAfford = gameState.points >= cost;
        
        const item = document.createElement('div');
        item.className = `upgrade-item ${canAfford ? 'affordable' : ''}`;
        
        const profitText = upgrade.profitType === 'click' 
            ? `+${upgrade.baseProfit} за клик`
            : `+${upgrade.baseProfit}/сек`;
        
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

// Рендер достижений
function renderAchievements() {
    const container = document.getElementById('achievementsList');
    container.innerHTML = '';
    
    gameState.achievements.forEach(achievement => {
        const item = document.createElement('div');
        item.className = `achievement-item ${achievement.unlocked ? 'unlocked' : ''}`;
        
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
        `;
        
        container.appendChild(item);
    });
}

// Обновление статистики
function updateStats() {
    document.getElementById('totalClicks').textContent = formatNumber(gameState.totalClicks);
    document.getElementById('totalEarned').textContent = formatNumber(gameState.totalEarned);
    document.getElementById('upgradesBought').textContent = gameState.upgradesBought;
    
    const playTime = Math.floor((Date.now() - gameState.startTime) / 60000);
    document.getElementById('playTime').textContent = playTime + ' мин';
}

// Переключение вкладок
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Удаление активного класса
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        
        // Добавление активного класса
        tab.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// Пассивный доход
setInterval(() => {
    if (gameState.pointsPerSecond > 0) {
        const earned = gameState.pointsPerSecond / 10; // 10 раз в секунду для плавности
        gameState.points += earned;
        gameState.totalEarned += earned;
        gameState.experience += earned;
        checkLevelUp();
        updateUI();
    }
}, 100);

// Автосохранение
setInterval(() => {
    saveGame();
}, 5000);

// Инициализация игры
loadGame();
updateUI();

// Добавление градиента для SVG
// Добавление градиента для SVG
const svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
gradient.setAttribute('id', 'crystalGradient');
gradient.setAttribute('x1', '0%');
gradient.setAttribute('y1', '0%');
gradient.setAttribute('x2', '0%');
gradient.setAttribute('y2', '100%');

const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
stop1.setAttribute('offset', '0%');
stop1.setAttribute('style', 'stop-color:#8b6bb8;stop-opacity:1');

const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
stop2.setAttribute('offset', '100%');
stop2.setAttribute('style', 'stop-color:#6b4e9e;stop-opacity:1');

gradient.appendChild(stop1);
gradient.appendChild(stop2);
svgDefs.appendChild(gradient);
document.querySelector('.crystal-svg').prepend(svgDefs);
