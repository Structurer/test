// 全局变量定义
let words = [];
let currentIndex = 0;
let toReviewWords = [];
let masteredWords = [];
let untrainedWords = [];
let latestMasteredIndex = -1;
let latestUntrainedIndex = -1;
let isMeaningHidden = false;
let isInited = false;

// DOM 元素获取
const toggleBtn = document.getElementById('toggleMeaningBtn');
const initScreen = document.getElementById('initScreen');
const startBtn = document.getElementById('startBtn');
const reviewCardScroll = document.getElementById('reviewCardScroll');
const masteredList = document.getElementById('masteredList');
const untrainedList = document.getElementById('untrainedList');
const masteredCountEl = document.getElementById('masteredCount');
const reviewCountEl = document.getElementById('reviewCount');
const untrainedCountEl = document.getElementById('untrainedCount');
const feedbackEl = document.getElementById('feedback');
const wordListEl = document.getElementById('wordList');
const shuffleBtn = document.getElementById('shuffleBtn');

let isAutoScroll = false;
let scrollTimeout = null;

// 初始化应用：隐藏首页 + 加载数据
function initApp() {
    if (isInited) return;
    isInited = true;
    initScreen.classList.add('hidden');

    // 加载单词数据
    fetch('Vocabulary.json')
        .then(response => {
            if (!response.ok) throw new Error('文件不存在或路径错误');
            return response.json();
        })
        .then(data => {
            words = data;
            toReviewWords = [...words];
            updateCounts();
            renderToReviewWords(toReviewWords);
            renderMasteredWords(); // 初始化左列（自动滚动到底部）
            renderUntrainedWords(); // 初始化右列（自动滚动到底部）
            activateCurrentWord();
            bindEvents();
            enableAllControls();
        })
        .catch(error => {
            wordListEl.innerHTML = `
                <div style="text-align: center; padding: 80px 20px; color: #e53e3e; font-size: 18px; line-height: 2;">
                    ❌ 单词数据加载失败！<br><br>
                    请检查：<br>
                    1. Vocabulary.json 文件是否在同文件夹<br>
                    2. 是否通过 HTTP 协议打开页面<br>
                </div>
            `;
            feedbackEl.textContent = '❌ 加载失败，请检查文件';
            feedbackEl.className = 'feedback error';
        });
}

// 绑定初始化触发事件（键盘/鼠标/按钮）
function bindInitEvents() {
    startBtn.addEventListener('click', initApp);
    document.addEventListener('click', (e) => {
        if (e.target === initScreen || e.target === startBtn) return;
        initApp();
    });
    document.addEventListener('keydown', initApp);
}

// 渲染中间列待巩固单词（仅卡片滚动，顶部固定）
function renderToReviewWords(wordArray) {
    wordListEl.innerHTML = '';
    if (wordArray.length === 0) {
        wordListEl.innerHTML = '<div class="empty-state">🎉 所有待巩固单词已分类完成！</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    wordArray.forEach((wordObj, index) => {
        const card = createWordCard(wordObj, index === currentIndex, 'word-card', false, true);
        fragment.appendChild(card);
    });
    wordListEl.appendChild(fragment);

    // 恢复释义隐藏状态
    if (isMeaningHidden) {
        hideMiddleTranslations();
    } else {
        showMiddleTranslations();
    }
}

// 渲染左列已牢记单词（始终滚动到最底部，显示最新单词）
function renderMasteredWords() {
    masteredList.innerHTML = '';
    if (masteredWords.length === 0) {
        masteredList.innerHTML = '<div class="empty-state">暂无已牢记单词<br>按←键将中间单词移至此处</div>';
        latestMasteredIndex = -1;
        return;
    }

    const fragment = document.createDocumentFragment();
    masteredWords.forEach((wordObj, index) => {
        // 最新添加的单词标记为 latest
        const isLatest = index === masteredWords.length - 1;
        const card = createWordCard(wordObj, false, 'mastered-card', isLatest, false);
        fragment.appendChild(card);
    });
    masteredList.appendChild(fragment);

    // 强制滚动到最底部（显示最新添加的单词）
    masteredList.scrollTop = masteredList.scrollHeight;
}

// 渲染右列待记忆单词（始终滚动到最底部，显示最新单词）
function renderUntrainedWords() {
    untrainedList.innerHTML = '';
    if (untrainedWords.length === 0) {
        untrainedList.innerHTML = '<div class="empty-state">暂无待记忆单词<br>按→键将中间单词移至此处</div>';
        latestUntrainedIndex = -1;
        return;
    }

    const fragment = document.createDocumentFragment();
    untrainedWords.forEach((wordObj, index) => {
        // 最新添加的单词标记为 latest
        const isLatest = index === untrainedWords.length - 1;
        const card = createWordCard(wordObj, false, 'untrained-card', isLatest, false);
        fragment.appendChild(card);
    });
    untrainedList.appendChild(fragment);

    // 强制滚动到最底部（显示最新添加的单词）
    untrainedList.scrollTop = untrainedList.scrollHeight;
}

// 创建单词卡片（通用函数）
function createWordCard(wordObj, isActive, cardClass, isLatest, isControlled) {
    const card = document.createElement('div');
    card.className = `${cardClass} ${isActive ? 'active' : ''} ${isLatest ? 'latest' : ''}`;
    if (isControlled) card.dataset.controlled = 'true';

    // 构建释义 HTML
    let translationsHtml = '<div class="translations-container">';
    wordObj.translations.forEach(trans => {
        const meanings = trans.translation.split('；');
        meanings.forEach(mean => {
            translationsHtml += `
                <div class="translation-item">
                    <span class="meaning">${mean.trim()}</span>
                    <span class="pos-tag">${trans.type}</span>
                </div>
            `;
        });
    });
    translationsHtml += '</div>';

    // 卡片完整 HTML
    card.innerHTML = `
        <div class="word-header">
            <div class="word">${wordObj.word}</div>
        </div>
        ${translationsHtml}
    `;

    // 单个释义点击切换（仅中间列卡片生效）
    if (isControlled) {
        const transItems = card.querySelectorAll('.translation-item');
        transItems.forEach(el => {
            el.addEventListener('click', () => {
                const meaningEl = el.querySelector('.meaning');
                meaningEl.classList.toggle('hidden');
            });
        });
    }

    return card;
}

// 启用所有交互控件
function enableAllControls() {
    toggleBtn.disabled = false;
    shuffleBtn.disabled = false;
}

// 激活当前单词（滚动+高亮，仅卡片区域滚动）
function activateCurrentWord() {
    const cards = document.querySelectorAll('.word-card');
    if (!cards[currentIndex]) return;

    isAutoScroll = true;
    // 高亮当前卡片
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));
    // 仅卡片区域滚动，顶部控制区固定
    cards[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 重置反馈区
    feedbackEl.textContent = '';
    feedbackEl.className = 'feedback';

    setTimeout(() => isAutoScroll = false, 500);
}

// 更新三列单词计数
function updateCounts() {
    masteredCountEl.textContent = masteredWords.length;
    reviewCountEl.textContent = toReviewWords.length;
    untrainedCountEl.textContent = untrainedWords.length;
}

// 切换单词（上下键/空格/Enter）
function switchWord(direction) {
    if (toReviewWords.length === 0) return;

    if (direction === 'up') {
        currentIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down') {
        currentIndex = Math.min(toReviewWords.length - 1, currentIndex + 1);
    }

    renderToReviewWords(toReviewWords);
    activateCurrentWord();
}

// 移至已牢记（左箭头）
function moveToMastered() {
    if (toReviewWords.length === 0) return;

    const currentWord = toReviewWords[currentIndex];
    masteredWords.push(currentWord); // 添加到左列

    // 删除当前单词
    toReviewWords.splice(currentIndex, 1);
    currentIndex = currentIndex >= toReviewWords.length ? Math.max(0, toReviewWords.length - 1) : currentIndex;

    renderToReviewWords(toReviewWords);
    renderMasteredWords(); // 重新渲染左列并滚动到底部
    updateCounts();

    if (toReviewWords.length > 0) {
        activateCurrentWord();
    } else {
        feedbackEl.textContent = '✅ 所有单词已分类，已牢记单词已更新';
    }
}

// 移至待记忆（右箭头）
function moveToUntrained() {
    if (toReviewWords.length === 0) return;

    const currentWord = toReviewWords[currentIndex];
    untrainedWords.push(currentWord); // 添加到右列

    // 删除当前单词
    toReviewWords.splice(currentIndex, 1);
    currentIndex = currentIndex >= toReviewWords.length ? Math.max(0, toReviewWords.length - 1) : currentIndex;

    renderToReviewWords(toReviewWords);
    renderUntrainedWords(); // 重新渲染右列并滚动到底部
    updateCounts();

    if (toReviewWords.length > 0) {
        activateCurrentWord();
    } else {
        feedbackEl.textContent = '✅ 所有单词已分类，待记忆单词已更新';
    }
}

// 随机打乱单词顺序
function shuffleToReviewWords() {
    if (toReviewWords.length === 0) return;

    // 打乱数组
    toReviewWords = [...toReviewWords].sort(() => Math.random() - 0.5);
    currentIndex = 0;

    // 显示加载提示
    wordListEl.innerHTML = `
        <div style="text-align: center; padding: 80px 20px; color: #4299e1; font-size: 18px;">
            ⏳ 正在打乱单词顺序...
        </div>
    `;

    // 延迟渲染，提升体验
    setTimeout(() => {
        renderToReviewWords(toReviewWords);
        activateCurrentWord();
        feedbackEl.textContent = '';
    }, 300);
}

// 隐藏中间列所有释义
function hideMiddleTranslations() {
    isMeaningHidden = true;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .translation-item .meaning');
    middleMeanings.forEach(el => el.classList.add('hidden'));
    toggleBtn.textContent = '显示释义';
}

// 显示中间列所有释义
function showMiddleTranslations() {
    isMeaningHidden = false;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .translation-item .meaning');
    middleMeanings.forEach(el => el.classList.remove('hidden'));
    toggleBtn.textContent = '隐藏释义';
}

// 切换释义显示/隐藏（单个按钮）
function toggleMeaning() {
    if (isMeaningHidden) {
        showMiddleTranslations();
    } else {
        hideMiddleTranslations();
    }
    feedbackEl.textContent = '';
}

// 绑定应用核心交互事件
function bindEvents() {
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                moveToMastered();
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveToUntrained();
                break;
            case 'ArrowUp':
                e.preventDefault();
                switchWord('up');
                break;
            case 'ArrowDown':
            case ' ':
            case 'Enter':
                e.preventDefault();
                switchWord('down');
                break;
            default:
                break;
        }
    });

    // 按钮事件
    toggleBtn.addEventListener('click', toggleMeaning);
    shuffleBtn.addEventListener('click', shuffleToReviewWords);

    // 滚动事件：同步当前选中单词（仅中间列卡片区域）
    reviewCardScroll.addEventListener('scroll', () => {
        if (isAutoScroll) return;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const cards = document.querySelectorAll('.word-card');
            const scrollAreaRect = reviewCardScroll.getBoundingClientRect();
            const centerY = scrollAreaRect.top + scrollAreaRect.height / 2;
            let closestIndex = currentIndex;
            let minDistance = Infinity;

            cards.forEach((card, index) => {
                const cardCenterY = card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2;
                const distance = Math.abs(cardCenterY - centerY);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                }
            });

            if (closestIndex !== currentIndex) {
                currentIndex = closestIndex;
                renderToReviewWords(toReviewWords);
            }
        }, 300);
    });
}

// 页面加载完成后绑定初始化事件
window.addEventListener('load', bindInitEvents);