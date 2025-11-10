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

// 【新增】防抖后的滚动函数（延迟100ms，可调整）
const debouncedScrollToCenter = debounce(() => {
    const cards = document.querySelectorAll('.word-card');
    const targetCard = cards[currentIndex];
    if (targetCard) {
        isAutoScroll = true;
        // 保持平滑滚动（behavior: 'smooth'）
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 滚动结束后取消自动滚动标记（比之前500ms更精准）
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

// 创建单词卡片（通用函数，修复词性字段名错误）
function createWordCard(wordObj, isActive, cardClass, isLatest, isControlled) {
    const card = document.createElement('div');
    card.className = `${cardClass} ${isActive ? 'active' : ''} ${isLatest ? 'latest' : ''}`;
    if (isControlled) card.dataset.controlled = 'true';

    // 构建释义 HTML（核心修复：将 trans.pos 改为 trans.type，匹配 JSON 中的字段名）
    let translationsHtml = '<div class="translations-container">';
    // 先判断 translations 是否存在且是数组
    const validTranslations = Array.isArray(wordObj.translations) ? wordObj.translations : [];
    
    validTranslations.forEach(trans => {
        // 处理释义：如果没有 translation 属性，显示空字符串
        const transText = trans?.translation || '';
        const meanings = transText.split('；').filter(mean => mean.trim()); // 过滤空释义
        // 核心修复：JSON 中词性字段是 type，不是 pos，所以用 trans.type
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
    // 如果没有有效释义，显示「无释义」
    if (translationsHtml === '<div class="translations-container">') {
        translationsHtml += `
            <div class="translation-item">
                <span class="meaning">无释义</span>
                <span class="pos-tag">未知词性</span>
            </div>
        `;
    }
    translationsHtml += '</div>';

    // 卡片完整 HTML（处理单词可能为空的情况）
    const wordText = wordObj?.word || '无单词';
    card.innerHTML = `
        <div class="word-header">
            <div class="word">${wordText}</div>
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

// 激活当前单词（仅高亮，滚动交给防抖函数）
function activateCurrentWord() {
    const cards = document.querySelectorAll('.word-card');
    if (!cards[currentIndex]) return;

    // 仅高亮当前卡片，不触发滚动（滚动由防抖函数统一处理）
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));

    // 初始化时触发一次滚动（让初始卡片居中）
    debouncedScrollToCenter();

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

// 切换单词（上下键/空格/Enter）
function switchWord(direction) {
    if (toReviewWords.length === 0) return;

    // 更新索引（边界保护）
    if (direction === 'up') {
        currentIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down') {
        currentIndex = Math.min(toReviewWords.length - 1, currentIndex + 1);
    } else if (direction === 'space' || direction === 'enter') {
        // 空格/Enter 保持当前索引，仅触发滚动（可选功能）
        debouncedScrollToCenter();
        return;
    }

    // 高亮新卡片
    const cards = document.querySelectorAll('.word-card');
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));

    // 触发防抖滚动（核心优化：避免频繁调用scrollIntoView）
    debouncedScrollToCenter();

    updateCounts();
    saveStateToLocalStorage();
}




// 移至已牢记（左箭头）
function moveToMastered() {
    if (toReviewWords.length === 0) return;

    // 取出当前选中的单词
    const currentWord = toReviewWords[currentIndex];
    // 添加到已牢记列表
    masteredWords.push(currentWord);
    // 从待巩固列表删除
    toReviewWords.splice(currentIndex, 1);

    // 更新索引（避免删除后索引越界）
    if (toReviewWords.length > 0) {
        currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    } else {
        currentIndex = 0;
    }

    // 重新渲染列表
    renderToReviewWords(toReviewWords);
    renderMasteredWords();
    updateCounts();
    saveStateToLocalStorage();

    // 触发防抖滚动（让新选中的卡片居中）
    if (toReviewWords.length > 0) {
        debouncedScrollToCenter();
    } else {
        isAutoScroll = false;
    }
}

// 移至待记忆（右箭头）
function moveToUntrained() {
    if (toReviewWords.length === 0) return;

    // 取出当前选中的单词
    const currentWord = toReviewWords[currentIndex];
    // 添加到待记忆列表
    untrainedWords.push(currentWord);
    // 从待巩固列表删除
    toReviewWords.splice(currentIndex, 1);

    // 更新索引（避免删除后索引越界）
    if (toReviewWords.length > 0) {
        currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    } else {
        currentIndex = 0;
    }

    // 重新渲染列表
    renderToReviewWords(toReviewWords);
    renderUntrainedWords();
    updateCounts();
    saveStateToLocalStorage();

    // 触发防抖滚动（让新选中的卡片居中）
    if (toReviewWords.length > 0) {
        debouncedScrollToCenter();
    } else {
        isAutoScroll = false;
    }
}

// 随机打乱单词顺序
function shuffleToReviewWords() {
    if (toReviewWords.length === 0) return;

    // 洗牌算法：打乱待巩固单词列表（不改变原数组）
    toReviewWords = [...toReviewWords].sort(() => Math.random() - 0.5);
    // 打乱后默认选中第一个单词
    currentIndex = 0;

    // 显示加载提示
    wordListEl.innerHTML = `
        <div style="text-align: center; padding: 80px 20px; color: #4299e1; font-size: 18px;">
            ⏳ 正在打乱单词顺序...
        </div>
    `;

    // 延迟渲染（提升视觉体验）
    setTimeout(() => {
        renderToReviewWords(toReviewWords);
        // 触发防抖滚动（让第一个卡片居中）
        debouncedScrollToCenter();
        updateCounts();
        saveStateToLocalStorage();
        feedbackEl.textContent = ''; // 清空提示
    }, 300);
}

// 隐藏中间列所有释义（无任何提示）
function hideMiddleTranslations() {
    isMeaningHidden = true;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.add('hidden'));
    toggleBtn.textContent = '显示释义';
    saveStateToLocalStorage();
}

// 显示中间列所有释义（无任何提示）
function showMiddleTranslations() {
    isMeaningHidden = false;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.remove('hidden'));
    toggleBtn.textContent = '隐藏释义';
    saveStateToLocalStorage();
}

// 切换释义显示/隐藏（单个按钮，无提示）
function toggleMeaning() {
    if (isMeaningHidden) {
        showMiddleTranslations();
    } else {
        hideMiddleTranslations();
    }
}

// 绑定应用核心交互事件（键盘+按钮）
function bindEvents() {
    // 键盘事件：上下键切换单词，左右键分类，空格/Enter居中
    document.addEventListener('keydown', (e) => {
        // 避免输入框中触发（如存在输入框）
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
                e.preventDefault();
                switchWord('down');
                break;
            case ' ':
                e.preventDefault();
                switchWord('space');
                break;
            case 'Enter':
                e.preventDefault();
                switchWord('enter');
                break;
            default:
                break;
        }
    });

    // 按钮事件：切换释义、打乱单词
    toggleBtn.addEventListener('click', toggleMeaning);
    shuffleBtn.addEventListener('click', shuffleToReviewWords);

    // 中间列滚动事件：同步当前选中单词（无粘滞感，遍历所有卡片）
    reviewCardScroll.addEventListener('scroll', () => {
        if (isAutoScroll) return; // 代码主动滚动时，不执行此逻辑
        
        const cards = document.querySelectorAll('.word-card');
        if (cards.length === 0) return; // 无卡片时直接返回
        
        const scrollAreaRect = reviewCardScroll.getBoundingClientRect();
        const centerY = scrollAreaRect.top + scrollAreaRect.height / 2; // 滚动容器垂直中点
        let closestIndex = currentIndex;
        let minDistance = Infinity;

        // 遍历所有卡片，找到最接近中点的卡片（纯计算，不卡顿）
        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterY = cardRect.top + cardRect.height / 2;
            const distance = Math.abs(cardCenterY - centerY);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        // 只更新高亮，不重新渲染（核心优化）
        if (closestIndex !== currentIndex) {
            cards[currentIndex]?.classList.remove('active');
            cards[closestIndex].classList.add('active');
            currentIndex = closestIndex;
            updateCounts();
            saveStateToLocalStorage();
        }
    });
}

// 初始化绑定：页面加载完成后绑定初始化触发事件
window.addEventListener('load', bindInitEvents);