// 全局变量定义
let words = [];
let currentIndex = 0;
let toReviewWords = [];
let masteredWords = [];
let untrainedWords = [];
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
// 本地存储键名（用于记录上次状态）
const STORAGE_KEY = 'wordReviewState';

// 初始化应用：隐藏首页 + 加载数据（优先加载本地存储状态）
function initApp() {
    if (isInited) return;
    isInited = true;
    initScreen.classList.add('hidden');

    // 尝试从本地存储加载上次状态
    const savedState = loadStateFromLocalStorage();
    if (savedState) {
        // 恢复上次的待巩固单词顺序、选中位置
        toReviewWords = savedState.toReviewWords;
        currentIndex = savedState.currentIndex;
        masteredWords = savedState.masteredWords;
        untrainedWords = savedState.untrainedWords;
        isMeaningHidden = savedState.isMeaningHidden || false;

        updateCounts();
        renderToReviewWords(toReviewWords);
        renderMasteredWords();
        renderUntrainedWords();
        activateCurrentWord();
        bindEvents();
        enableAllControls();
        // 恢复释义隐藏状态
        if (isMeaningHidden) {
            hideMiddleTranslations();
        } else {
            showMiddleTranslations();
        }
    } else {
        // 本地存储无状态，加载原始单词数据
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
                renderMasteredWords();
                renderUntrainedWords();
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
}

// 从本地存储加载状态
function loadStateFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        return JSON.parse(saved);
    } catch (e) {
        console.error('加载本地存储失败：', e);
        return null;
    }
}

// 保存当前状态到本地存储（每次状态变化时调用）
function saveStateToLocalStorage() {
    const state = {
        toReviewWords: toReviewWords, // 待巩固单词当前顺序
        currentIndex: currentIndex,   // 当前选中的位置
        masteredWords: masteredWords, // 已牢记单词
        untrainedWords: untrainedWords, // 待记忆单词
        isMeaningHidden: isMeaningHidden // 释义隐藏状态
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('保存本地存储失败：', e);
    }
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
        hideMiddleTranslations(false);
    } else {
        showMiddleTranslations(false);
    }
}

// 渲染左列已牢记单词（始终滚动到最底部，显示最新单词）
function renderMasteredWords() {
    masteredList.innerHTML = '';
    if (masteredWords.length === 0) {
        masteredList.innerHTML = '<div class="empty-state">暂无已牢记单词<br>按←键将中间单词移至此处</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    masteredWords.forEach((wordObj, index) => {
        const isLatest = index === masteredWords.length - 1;
        const card = createWordCard(wordObj, false, 'mastered-card', isLatest, false);
        fragment.appendChild(card);
    });
    masteredList.appendChild(fragment);

    // 强制滚动到最底部
    masteredList.scrollTop = masteredList.scrollHeight;
}

// 渲染右列待记忆单词（始终滚动到最底部，显示最新单词）
function renderUntrainedWords() {
    untrainedList.innerHTML = '';
    if (untrainedWords.length === 0) {
        untrainedList.innerHTML = '<div class="empty-state">暂无待记忆单词<br>按→键将中间单词移至此处</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    untrainedWords.forEach((wordObj, index) => {
        const isLatest = index === untrainedWords.length - 1;
        const card = createWordCard(wordObj, false, 'untrained-card', isLatest, false);
        fragment.appendChild(card);
    });
    untrainedList.appendChild(fragment);

    // 强制滚动到最底部
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

    // 更新计数（当前位置变化后需更新）
    updateCounts();
    // 保存状态到本地存储
    saveStateToLocalStorage();

    setTimeout(() => isAutoScroll = false, 500);
}

// 更新三列单词计数（核心修改：中间列改为“总词数 | 当前位置”）
function updateCounts() {
    // 左列：已牢记单词数
    masteredCountEl.textContent = masteredWords.length;
    // 右列：待记忆单词数
    untrainedCountEl.textContent = untrainedWords.length;
    // 中间列：待巩固总词数 | 当前选中位置（位置从1开始计数）
    const total = toReviewWords.length;
    const currentPos = total > 0 ? currentIndex + 1 : 0; // 位置从1开始，避免0开头
    reviewCountEl.textContent = `${total} | ${currentPos}`; // 格式：总词数 | 当前位置
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
    // 保存状态
    saveStateToLocalStorage();
}

// 移至已牢记（左箭头）
function moveToMastered() {
    if (toReviewWords.length === 0) return;

    const currentWord = toReviewWords[currentIndex];
    masteredWords.push(currentWord);

    // 删除当前单词
    toReviewWords.splice(currentIndex, 1);
    // 调整当前索引（避免删除后索引越界）
    currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    if (toReviewWords.length === 0) currentIndex = 0;

    renderToReviewWords(toReviewWords);
    renderMasteredWords();
    updateCounts();
    // 保存状态到本地存储
    saveStateToLocalStorage();

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
    untrainedWords.push(currentWord);

    // 删除当前单词
    toReviewWords.splice(currentIndex, 1);
    // 调整当前索引（避免删除后索引越界）
    currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    if (toReviewWords.length === 0) currentIndex = 0;

    renderToReviewWords(toReviewWords);
    renderUntrainedWords();
    updateCounts();
    // 保存状态到本地存储
    saveStateToLocalStorage();

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
    currentIndex = 0; // 打乱后默认选中第一个

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
        // 保存打乱后的状态
        saveStateToLocalStorage();
    }, 300);
}

// 隐藏中间列所有释义（添加是否显示提示的参数）
function hideMiddleTranslations(showTip = true) {
    isMeaningHidden = true;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .translation-item .meaning');
    middleMeanings.forEach(el => el.classList.add('hidden'));
    toggleBtn.textContent = '显示释义';
    if (showTip) {
        feedbackEl.textContent = '🙈 中间列释义已隐藏';
    }
    // 保存状态
    saveStateToLocalStorage();
}

// 显示中间列所有释义（添加是否显示提示的参数）
function showMiddleTranslations(showTip = true) {
    isMeaningHidden = false;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .translation-item .meaning');
    middleMeanings.forEach(el => el.classList.remove('hidden'));
    toggleBtn.textContent = '隐藏释义';
    if (showTip) {
        feedbackEl.textContent = '👀 中间列释义已显示';
    }
    // 保存状态
    saveStateToLocalStorage();
}

// 切换释义显示/隐藏（单个按钮）
function toggleMeaning() {
    if (isMeaningHidden) {
        showMiddleTranslations();
    } else {
        hideMiddleTranslations();
    }
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
                updateCounts();
                saveStateToLocalStorage();
            }
        }, 300);
    });
}

// 页面加载完成后绑定初始化事件
window.addEventListener('load', bindInitEvents);