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

// 【新增】防抖工具函数：限制scrollIntoView调用频率，解决长按方向键卡顿
function debounce(func, delay) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer); // 清除之前的延迟任务
        timer = setTimeout(() => func.apply(this, args), delay); // 延迟执行最新任务
    };
}

// 【核心修改1】滚动函数加参数 isForceCenter：true=强制居中（上下键），false=就近显示（左右键）
const debouncedScrollToCenter = debounce((isForceCenter = true) => {
    const cards = document.querySelectorAll('.word-card');
    const targetCard = cards[currentIndex];
    if (targetCard) {
        isAutoScroll = true;
        // 按参数切换滚动策略：上下键用 center，左右键用 nearest
        const blockStrategy = isForceCenter ? 'center' : 'nearest';
        targetCard.scrollIntoView({ behavior: 'smooth', block: blockStrategy });
        // 滚动结束后取消自动滚动标记
        setTimeout(() => isAutoScroll = false, 300);
    }
}, 100);

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
        activateCurrentWord(); // 初始激活选中卡片
        bindEvents();
        enableAllControls();
        // 恢复释义隐藏状态（无提示）
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
                activateCurrentWord(); // 初始激活选中卡片
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

    // 核心新增1：监听窗口大小变化，强制滚动到底部
    window.addEventListener('resize', () => {
        // 窗口缩放时，延迟100ms执行（避免频繁触发）
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            if (isInited) { // 确保应用已初始化
                forceScrollToBottom(); // 强制左右列滚到底
            }
        }, 100);
    });
}

// 核心新增2：强制左右列滚动到底部的通用函数
function forceScrollToBottom() {
    // 左列强制滚到底
    if (masteredList.scrollHeight > 0) {
        masteredList.scrollTop = masteredList.scrollHeight;
    }
    // 右列强制滚到底
    if (untrainedList.scrollHeight > 0) {
        untrainedList.scrollTop = untrainedList.scrollHeight;
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

    // 恢复释义隐藏状态（无提示）
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
        return;
    }

    const fragment = document.createDocumentFragment();
    masteredWords.forEach((wordObj, index) => {
        const isLatest = index === masteredWords.length - 1;
        const card = createWordCard(wordObj, false, 'mastered-card', isLatest, false);
        fragment.appendChild(card);
    });
    masteredList.appendChild(fragment);

    // 强制滚动到最底部（调用通用函数）
    forceScrollToBottom();
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

    // 强制滚动到最底部（调用通用函数）
    forceScrollToBottom();
}

// 创建单词卡片（通用函数，匹配 JSON 的 type 字段）
function createWordCard(wordObj, isActive, cardClass, isLatest, isControlled) {
    const card = document.createElement('div');
    card.className = `${cardClass} ${isActive ? 'active' : ''} ${isLatest ? 'latest' : ''}`;
    if (isControlled) card.dataset.controlled = 'true';

    // 构建释义 HTML
    let translationsHtml = '<div class="translations-container">';
    const validTranslations = Array.isArray(wordObj.translations) ? wordObj.translations : [];
    
    validTranslations.forEach(trans => {
        const transText = trans?.translation || '';
        const meanings = transText.split('；').filter(mean => mean.trim());
        const posText = trans?.type?.trim() || '未知词性';

        meanings.forEach(mean => {
            translationsHtml += `
                <div class="translation-item">
                    <span class="meaning">${mean.trim()}</span>
                    <span class="pos-tag">${posText}</span>
                </div>
            `;
        });
    });
    if (translationsHtml === '<div class="translations-container">') {
        translationsHtml += `
            <div class="translation-item">
                <span class="meaning">无释义</span>
                <span class="pos-tag">未知词性</span>
            </div>
        `;
    }
    translationsHtml += '</div>';

    const wordText = wordObj?.word || '无单词';
    card.innerHTML = `
        <div class="word-header">
            <div class="word">${wordText}</div>
        </div>
        ${translationsHtml}
    `;

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

// 激活当前单词（仅高亮，滚动交给防抖函数）
function activateCurrentWord() {
    const cards = document.querySelectorAll('.word-card');
    if (!cards[currentIndex]) return;

    // 仅高亮当前卡片，不触发滚动（滚动由防抖函数统一处理）
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));

    // 初始化时触发强制居中（isForceCenter: true）
    debouncedScrollToCenter(true);

    updateCounts();
    saveStateToLocalStorage();
}

// 更新三列单词计数（格式：当前位置 | 总词数）
function updateCounts() {
    // 左列：已牢记单词数
    masteredCountEl.textContent = masteredWords.length;
    // 右列：待记忆单词数
    untrainedCountEl.textContent = untrainedWords.length;
    // 中间列：当前选中位置 | 总词数（位置从1开始）
    const total = toReviewWords.length;
    const currentPos = total > 0 ? currentIndex + 1 : 0;
    reviewCountEl.textContent = `${currentPos} | ${total}`;
}

// 切换单词（上下键/空格/Enter）- 【核心修改2】调用滚动函数时传 true（强制居中）
function switchWord(direction) {
    if (toReviewWords.length === 0) return;

    // 更新索引（边界保护）
    if (direction === 'up') {
        currentIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down') {
        currentIndex = Math.min(toReviewWords.length - 1, currentIndex + 1);
    } else if (direction === 'space' || direction === 'enter') {
        // 空格/Enter 保持当前索引，仅触发滚动（强制居中）
        debouncedScrollToCenter(true);
        return;
    }

    // 高亮新卡片
    const cards = document.querySelectorAll('.word-card');
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));

    // 上下键切换：传 true 强制居中
    debouncedScrollToCenter(true);

    updateCounts();
    saveStateToLocalStorage();
}

// 移至已牢记（左箭头）- 就近显示，无额外滑动
function moveToMastered() {
    if (toReviewWords.length === 0) return;

    const currentWord = toReviewWords[currentIndex];
    const scrollTop = reviewCardScroll.scrollTop;
    masteredWords.push(currentWord);
    toReviewWords.splice(currentIndex, 1);

    if (toReviewWords.length > 0) {
        currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    } else {
        currentIndex = 0;
    }

    renderToReviewWords(toReviewWords);
    renderMasteredWords();
    updateCounts();
    saveStateToLocalStorage();

    if (toReviewWords.length > 0) {
        reviewCardScroll.scrollTop = scrollTop;
        // 核心修改：传 false → 就近显示（block: 'nearest'）
        debouncedScrollToCenter(false);
    } else {
        isAutoScroll = false;
    }
}

// 移至待记忆（右箭头）- 就近显示，无额外滑动
function moveToUntrained() {
    if (toReviewWords.length === 0) return;

    const currentWord = toReviewWords[currentIndex];
    const scrollTop = reviewCardScroll.scrollTop;
    untrainedWords.push(currentWord);
    toReviewWords.splice(currentIndex, 1);

    if (toReviewWords.length > 0) {
        currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    } else {
        currentIndex = 0;
    }

    renderToReviewWords(toReviewWords);
    renderUntrainedWords();
    updateCounts();
    saveStateToLocalStorage();

    if (toReviewWords.length > 0) {
        reviewCardScroll.scrollTop = scrollTop;
        // 核心修改：传 false → 就近显示（block: 'nearest'）
        debouncedScrollToCenter(false);
    } else {
        isAutoScroll = false;
    }
}

// 随机打乱单词顺序
function shuffleToReviewWords() {
    if (toReviewWords.length === 0) return;

    toReviewWords = [...toReviewWords].sort(() => Math.random() - 0.5);
    currentIndex = 0;

    wordListEl.innerHTML = `
        <div style="text-align: center; padding: 80px 20px; color: #4299e1; font-size: 18px;">
            ⏳ 正在打乱单词顺序...
        </div>
    `;

    setTimeout(() => {
        renderToReviewWords(toReviewWords);
        // 打乱后强制居中（传 true），保持视觉聚焦
        debouncedScrollToCenter(true);
        updateCounts();
        saveStateToLocalStorage();
        feedbackEl.textContent = '';
    }, 300);
}

// 隐藏中间列所有释义
function hideMiddleTranslations() {
    isMeaningHidden = true;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.add('hidden'));
    toggleBtn.textContent = '显示释义';
    saveStateToLocalStorage();
}

// 显示中间列所有释义
function showMiddleTranslations() {
    isMeaningHidden = false;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.remove('hidden'));
    toggleBtn.textContent = '隐藏释义';
    saveStateToLocalStorage();
}

// 切换释义显示/隐藏
function toggleMeaning() {
    if (isMeaningHidden) {
        showMiddleTranslations();
    } else {
        hideMiddleTranslations();
    }
}

// 绑定核心交互事件（空格/Enter = 向下切换单词）- 【关键修改处】
function bindEvents() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // 新增：拦截上下键/空格/Enter的长按连续触发（e.repeat为true时是长按连发）
        const forbiddenKeys = ['ArrowUp', 'ArrowDown', ' ', 'Enter'];
        if (forbiddenKeys.includes(e.key) && e.repeat) {
            e.preventDefault();
            return;
        }

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
                switchWord('up'); // 向上切换，强制居中
                break;
            case 'ArrowDown':
                e.preventDefault();
                switchWord('down'); // 向下切换，强制居中
                break;
            case ' ':
                e.preventDefault();
                switchWord('down'); // 空格向下，强制居中
                break;
            case 'Enter':
                e.preventDefault();
                switchWord('down'); // Enter向下，强制居中
                break;
            default:
                break;
        }
    });

    toggleBtn.addEventListener('click', toggleMeaning);
    shuffleBtn.addEventListener('click', shuffleToReviewWords);

    // 中间列滚动同步选中
    reviewCardScroll.addEventListener('scroll', () => {
        if (isAutoScroll) return;
        
        const cards = document.querySelectorAll('.word-card');
        if (cards.length === 0) return;
        
        const scrollAreaRect = reviewCardScroll.getBoundingClientRect();
        const centerY = scrollAreaRect.top + scrollAreaRect.height / 2;
        let closestIndex = currentIndex;
        let minDistance = Infinity;

        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterY = cardRect.top + cardRect.height / 2;
            const distance = Math.abs(cardCenterY - centerY);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== currentIndex) {
            cards[currentIndex]?.classList.remove('active');
            cards[closestIndex].classList.add('active');
            currentIndex = closestIndex;
            updateCounts();
            saveStateToLocalStorage();
        }
    });
}

// 页面加载完成后初始化
window.addEventListener('load', bindInitEvents);
