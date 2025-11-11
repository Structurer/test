// 全局变量定义
let words = [];
let currentIndex = 0;
let toReviewWords = []; // 中间列（记忆区）单词数组（完整对象格式）
let masteredWords = [];  // 左列（已牢记）单词数组
let untrainedWords = []; // 右列（待巩固）单词数组
let isMeaningHidden = false;
let isInited = false;

// DOM 元素获取
const toggleBtn = document.getElementById('toggleMeaningBtn');
const initScreen = document.getElementById('initScreen');
const startBtn = document.getElementById('startBtn');
const reviewCardScroll = document.getElementById('reviewCardScroll'); // 中间列（记忆区）滚动容器
const masteredList = document.getElementById('masteredList'); // 左列（已牢记）列表容器
const untrainedList = document.getElementById('untrainedList'); // 右列（待巩固）列表容器
const masteredCountEl = document.getElementById('masteredCount'); // 左列（已牢记）计数
const reviewCountEl = document.getElementById('reviewCount'); // 中间列（记忆区）计数
const untrainedCountEl = document.getElementById('untrainedCount'); // 右列（待巩固）计数
const feedbackEl = document.getElementById('feedback');
const wordListEl = document.getElementById('wordList'); // 中间列（记忆区）单词列表
const shuffleBtn = document.getElementById('shuffleBtn');
// 单词输入框
const wordInput = document.getElementById('wordInput');

let isAutoScroll = false;
let scrollTimeout = null;
// 本地存储键名
const STORAGE_KEY = 'wordReviewState';

// 初始化输入框（拦截功能键）
function initInput() {
    if (wordInput) {
        wordInput.focus();
        wordInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                // 左箭头：移至已牢记
                case 'ArrowLeft':
                    e.preventDefault();
                    moveToMastered();
                    break;
                // 右箭头：移至待巩固
                case 'ArrowRight':
                    e.preventDefault();
                    moveToUntrained();
                    break;
                // 空格：移至已牢记
                case ' ':
                    e.preventDefault();
                    moveToMastered();
                    break;
                // Enter：验证输入
                case 'Enter':
                    e.preventDefault();
                    validateInputWord();
                    break;
                // 上箭头：切换上一个单词
                case 'ArrowUp':
                    e.preventDefault();
                    switchWord('up');
                    break;
                // 下箭头：切换下一个单词
                case 'ArrowDown':
                    e.preventDefault();
                    switchWord('down');
                    break;
                // 非功能键：正常输入
                default:
                    break;
            }
        });
    }
}

// 验证输入单词（适配完整对象格式）
function validateInputWord() {
    if (!wordInput || toReviewWords.length === 0) return;
    
    const inputValue = wordInput.value.trim();
    const currentWordObj = toReviewWords[currentIndex];
    const currentWord = currentWordObj?.word?.trim() || '';
    
    if (inputValue.toLowerCase() === currentWord.toLowerCase()) {
        // 正确：加 success 类触发绿色闪烁
        wordInput.classList.add('success');
        moveToUntrained();
        wordInput.value = '';
        wordInput.focus();
        // 动画结束后移除类（避免重复触发异常）
        setTimeout(() => wordInput.classList.remove('success'), 500);
    } else {
        // 错误：加 error 类触发粉色闪烁
        wordInput.classList.add('error');
        wordInput.select();
        // 动画结束后移除类
        setTimeout(() => wordInput.classList.remove('error'), 500);
    }
}

// 防抖工具函数
function debounce(func, delay) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

// 滚动函数：中间列高亮卡置顶
const debouncedScrollToTarget = debounce(() => {
    const cards = document.querySelectorAll('.word-card');
    const targetCard = cards[currentIndex];
    if (!targetCard) return;

    isAutoScroll = true;
    const scrollContainer = reviewCardScroll;
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const cardTopY = targetCard.getBoundingClientRect().top;

    const scrollOffset = scrollContainer.scrollTop + (cardTopY - containerTop);
    scrollContainer.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
    });

    setTimeout(() => isAutoScroll = false, 300);
}, 100);

// 初始化应用
function initApp() {
    if (isInited) return;
    isInited = true;
    initScreen.classList.add('hidden');
    initInput();

    const savedState = loadStateFromLocalStorage();
    if (savedState) {
        toReviewWords = savedState.toReviewWords;
        currentIndex = savedState.currentIndex || 0;
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
        if (isMeaningHidden) {
            hideMiddleTranslations();
        } else {
            showMiddleTranslations();
        }
    } else {
        fetch('Vocabulary.json')
            .then(response => {
                if (!response.ok) throw new Error('文件加载失败');
                return response.json();
            })
            .then(data => {
                words = data;
                toReviewWords = [...data]; // 直接存储完整对象数组
                currentIndex = 0;
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

    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            if (isInited) {
                forceScrollToTop();
                debouncedScrollToTarget();
            }
        }, 100);
    });
}

// 强制左右列滚到顶部
function forceScrollToTop() {
    if (masteredList.scrollHeight > 0) {
        masteredList.scrollTop = 0;
    }
    if (untrainedList.scrollHeight > 0) {
        untrainedList.scrollTop = 0;
    }
}

// 加载本地存储
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

// 保存本地存储
function saveStateToLocalStorage() {
    const state = {
        toReviewWords: toReviewWords,
        currentIndex: currentIndex,
        masteredWords: masteredWords,
        untrainedWords: untrainedWords,
        isMeaningHidden: isMeaningHidden
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('保存本地存储失败：', e);
    }
}

// 绑定初始化事件
function bindInitEvents() {
    startBtn.addEventListener('click', initApp);
    document.addEventListener('click', (e) => {
        if (e.target === initScreen || e.target === startBtn) return;
        initApp();
    });
    document.addEventListener('keydown', initApp);
}

// 渲染中间列（记忆区）单词（传递完整对象，无短语）
function renderToReviewWords(wordArray) {
    wordListEl.innerHTML = '';
    if (wordArray.length === 0) {
        wordListEl.innerHTML = '<div class="empty-state">🎉 所有记忆区单词已分类完成！</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    wordArray.forEach((wordObj, index) => {
        // 传递完整wordObj，确保读取translations和type
        const card = createWordCard(wordObj, index === currentIndex, 'word-card', false, true);
        fragment.appendChild(card);
    });
    wordListEl.appendChild(fragment);

    if (isMeaningHidden) {
        hideMiddleTranslations();
    } else {
        showMiddleTranslations();
    }
}

// 渲染左列（已牢记）单词（传递完整对象，无短语）
function renderMasteredWords() {
    masteredList.innerHTML = '';
    if (masteredWords.length === 0) {
        masteredList.innerHTML = '<div class="empty-state">暂无已牢记单词<br>按←键或空格将中间单词移至此处</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    masteredWords.forEach((wordObj, index) => {
        const isLatest = index === 0;
        // 传递完整wordObj
        const card = createWordCard(wordObj, false, 'mastered-card', isLatest, false);
        fragment.appendChild(card);
    });
    masteredList.appendChild(fragment);

    forceScrollToTop();
}

// 渲染右列（待巩固）单词（传递完整对象，无短语）
function renderUntrainedWords() {
    untrainedList.innerHTML = '';
    if (untrainedWords.length === 0) {
        untrainedList.innerHTML = '<div class="empty-state">暂无待巩固单词<br>按→键或输入正确后按Enter将中间单词移至此处</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    untrainedWords.forEach((wordObj, index) => {
        const isLatest = index === 0;
        // 传递完整wordObj
        const card = createWordCard(wordObj, false, 'untrained-card', isLatest, false);
        fragment.appendChild(card);
    });
    untrainedList.appendChild(fragment);

    forceScrollToTop();
}

// 创建单词卡片（仅单词+释义+词性，无短语）
function createWordCard(wordObj, isActive, cardClass, isLatest, isControlled) {
    const card = document.createElement('div');
    card.className = `${cardClass} ${isActive ? 'active' : ''} ${isLatest ? 'latest' : ''}`;
    if (isControlled) card.dataset.controlled = 'true';

    // 构建释义HTML（仅释义+词性）
    let translationsHtml = '<div class="translations-container">';
    if (wordObj?.translations && Array.isArray(wordObj.translations)) {
        wordObj.translations.forEach(trans => {
            const transText = trans.translation || '';
            const meanings = transText.split('；').filter(mean => mean.trim());
            const typeText = trans.type || '未知词性'; // 读取JSON中的type字段
            
            meanings.forEach(mean => {
                translationsHtml += `
                    <div class="translation-item">
                        <span class="meaning">${mean.trim()}</span>
                        <span class="pos-tag">${typeText}</span>
                    </div>
                `;
            });
        });
    } else {
        translationsHtml += `
            <div class="translation-item">
                <span class="meaning">无释义</span>
                <span class="pos-tag">未知词性</span>
            </div>
        `;
    }
    translationsHtml += '</div>';

    const wordText = wordObj.word || '无单词';
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

// 启用控件
function enableAllControls() {
    toggleBtn.disabled = false;
    shuffleBtn.disabled = false;
}

// 激活当前单词
function activateCurrentWord() {
    const cards = document.querySelectorAll('.word-card');
    if (!cards[currentIndex]) return;

    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));
    debouncedScrollToTarget();
    updateCounts();
    saveStateToLocalStorage();
}

// 更新计数
function updateCounts() {
    masteredCountEl.textContent = masteredWords.length;
    untrainedCountEl.textContent = untrainedWords.length;
    const total = toReviewWords.length;
    const currentPos = total > 0 ? currentIndex + 1 : 0;
    reviewCountEl.textContent = `${currentPos} | ${total}`;
}




















// 切换单词（上下键）
function switchWord(direction) {
    if (toReviewWords.length === 0) return;

    if (direction === 'up') {
        currentIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down') {
        currentIndex = Math.min(toReviewWords.length - 1, currentIndex + 1);
    }

    const cards = document.querySelectorAll('.word-card');
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));
    debouncedScrollToTarget();
    
    if (wordInput) wordInput.focus();
    updateCounts();
    saveStateToLocalStorage();
}

// 移至已牢记区
function moveToMastered() {
    if (toReviewWords.length === 0) return;

    const currentWordObj = toReviewWords[currentIndex];
    masteredWords.unshift(currentWordObj); // 存储完整对象（确保释义/词性保留）
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
        debouncedScrollToTarget();
    } else {
        isAutoScroll = false;
    }

    if (wordInput) wordInput.focus();
}

// 移至待巩固区
function moveToUntrained() {
    if (toReviewWords.length === 0) return;

    const currentWordObj = toReviewWords[currentIndex];
    untrainedWords.unshift(currentWordObj); // 存储完整对象（确保释义/词性保留）
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
        debouncedScrollToTarget();
    } else {
        isAutoScroll = false;
    }

    if (wordInput) wordInput.focus();
}

// 随机打乱单词顺序
function shuffleToReviewWords() {
    if (toReviewWords.length === 0) return;

    toReviewWords = [...toReviewWords].sort(() => Math.random() - 0.5);
    currentIndex = 0;

    wordListEl.innerHTML = `
        <div style="text-align: center; padding: 80px 20px; color: #4299e1; font-size: 18px; line-height: 2;">
            ⏳ 正在打乱单词顺序...
        </div>
    `;

    setTimeout(() => {
        renderToReviewWords(toReviewWords);
        debouncedScrollToTarget();
        updateCounts();
        saveStateToLocalStorage();
        feedbackEl.textContent = '';
        if (wordInput) wordInput.focus();
    }, 300);
}

// 隐藏中间列释义
function hideMiddleTranslations() {
    isMeaningHidden = true;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.add('hidden'));
    toggleBtn.textContent = '显示释义';
    saveStateToLocalStorage();
}

// 显示中间列释义
function showMiddleTranslations() {
    isMeaningHidden = false;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.remove('hidden'));
    toggleBtn.textContent = '隐藏释义';
    saveStateToLocalStorage();
}

// 切换释义显示状态
function toggleMeaning() {
    if (isMeaningHidden) {
        showMiddleTranslations();
    } else {
        hideMiddleTranslations();
    }
}

// 绑定核心交互事件
function bindEvents() {
    // 1. 全局按键事件（输入框未聚焦时）
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const forbiddenKeys = ['ArrowUp', 'ArrowDown', ' ', 'Enter', 'ArrowLeft', 'ArrowRight'];
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
                switchWord('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                switchWord('down');
                break;
            case ' ':
                e.preventDefault();
                moveToMastered();
                break;
            case 'Enter':
                e.preventDefault();
                break;
            default:
                break;
        }
    });

    // 2. 全局字母/数字键自动聚焦输入框
    document.addEventListener('keydown', (e) => {
        const isLetterOrNumber = /^[a-zA-Z0-9]$/.test(e.key);
        if (isLetterOrNumber && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            wordInput.focus();
            wordInput.value += e.key;
        }
    });

    // 3. 按钮事件
    toggleBtn.addEventListener('click', toggleMeaning);
    shuffleBtn.addEventListener('click', shuffleToReviewWords);

    // 4. 滚动同步选中
    reviewCardScroll.addEventListener('scroll', () => {
        if (isAutoScroll) return;
        
        const cards = document.querySelectorAll('.word-card');
        if (cards.length === 0) return;
        
        const scrollContainer = reviewCardScroll;
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetY = containerRect.top;

        let closestIndex = currentIndex;
        let minDistance = Infinity;

        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const cardTopY = cardRect.top;
            const distance = Math.abs(cardTopY - targetY);

            if (distance < minDistance || (distance === minDistance && index > closestIndex)) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== currentIndex) {
            cards[currentIndex]?.classList.remove('active');
            cards[closestIndex].classList.add('active');
            currentIndex = closestIndex;
            debouncedScrollToTarget();
            if (wordInput) wordInput.focus();
            updateCounts();
            saveStateToLocalStorage();
        }
    });
}

// 页面加载初始化
window.addEventListener('load', bindInitEvents);