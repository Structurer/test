// 全局变量定义
let words = [];
let currentIndex = 0;
let toReviewWords = []; // 中间列（记忆区）单词数组（支持对象{word: "xxx"}或字符串）
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
// 【新增】单词输入框
const wordInput = document.getElementById('wordInput');

let isAutoScroll = false;
let scrollTimeout = null;
// 本地存储键名（用于记录上次状态）
const STORAGE_KEY = 'wordReviewState';

// 【核心修改】初始化输入框（拦截功能键，解决覆盖问题）
function initInput() {
    if (wordInput) {
        // 输入框默认聚焦
        wordInput.focus();
        // 按下按键时触发（优先拦截功能键）
        wordInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                // 1. 左箭头：移至已牢记（阻止光标左移）
                case 'ArrowLeft':
                    e.preventDefault();
                    moveToMastered();
                    break;
                // 2. 右箭头：移至待巩固（阻止光标右移）
                case 'ArrowRight':
                    e.preventDefault();
                    moveToUntrained();
                    break;
                // 3. 空格：移至已牢记（阻止输入空格）
                case ' ':
                    e.preventDefault();
                    moveToMastered();
                    break;
                // 4. Enter：验证输入（阻止换行/提交，修复无反应问题）
                case 'Enter':
                    e.preventDefault();
                    validateInputWord();
                    break;
                // 5. 上箭头：切换上一个单词（阻止光标上移）
                case 'ArrowUp':
                    e.preventDefault();
                    switchWord('up');
                    break;
                // 6. 下箭头：切换下一个单词（阻止光标下移）
                case 'ArrowDown':
                    e.preventDefault();
                    switchWord('down');
                    break;
                // 非功能键（字母、数字等）：正常输入，不拦截
                default:
                    break;
            }
        });
    }
}

// 【核心修改】验证输入单词与当前选中单词是否一致（修复对比逻辑）
function validateInputWord() {
    if (!wordInput || toReviewWords.length === 0) return;
    
    const inputValue = wordInput.value.trim();
    // 关键修复：兼容对象格式（{word: "xxx"}）和字符串格式，确保取到正确的单词文本
    const currentWordItem = toReviewWords[currentIndex];
    const currentWord = typeof currentWordItem === 'object' && currentWordItem.word 
        ? currentWordItem.word.trim() 
        : String(currentWordItem).trim();
    
    // 不区分大小写对比
    if (inputValue.toLowerCase() === currentWord.toLowerCase()) {
        // 输入正确，执行右移功能（移至待巩固区）
        moveToUntrained();
        // 清空输入框并重新聚焦
        wordInput.value = '';
        wordInput.focus();
    } else {
        // 输入错误，全选输入框内容（方便直接覆盖）
        wordInput.select();
    }
}

// 【新增】判断是否为弹窗窗口（避免循环，保留以备后续用）
const isPopupWindow = window.opener !== null;

// 【新增】防抖工具函数：限制scrollIntoView调用频率，解决长按方向键卡顿
function debounce(func, delay) {
    let timer = null;
    return function(...args) {
        if (timer) clearTimeout(timer); // 清除之前的延迟任务
        timer = setTimeout(() => func.apply(this, args), delay); // 延迟执行最新任务
    };
}

// 【核心修改1】滚动函数：中间列（记忆区）高亮卡对齐窗口顶部（原对齐中点）
const debouncedScrollToTarget = debounce(() => {
    const cards = document.querySelectorAll('.word-card');
    const targetCard = cards[currentIndex];
    if (!targetCard) return;

    isAutoScroll = true;
    // 基准点：窗口顶部（原逻辑是窗口中点）
    const scrollContainer = reviewCardScroll;
    const containerTop = scrollContainer.getBoundingClientRect().top; // 窗口顶部坐标
    const cardTopY = targetCard.getBoundingClientRect().top; // 高亮卡顶部坐标

    // 计算滚动距离：让中间列（记忆区）高亮卡顶部与窗口顶部对齐
    const scrollOffset = scrollContainer.scrollTop + (cardTopY - containerTop);
    scrollContainer.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
    });

    // 滚动结束后取消自动滚动标记
    setTimeout(() => isAutoScroll = false, 300);
}, 100);

// 初始化应用：隐藏首页 + 加载数据（优先加载本地存储状态）
function initApp() {
    if (isInited) return;
    isInited = true;
    initScreen.classList.add('hidden');
    // 【新增】初始化输入框
    initInput();

    // 尝试从本地存储加载上次状态
    const savedState = loadStateFromLocalStorage();
    if (savedState) {
        // 恢复上次的中间列（记忆区）单词顺序、选中位置
        toReviewWords = savedState.toReviewWords;
        currentIndex = savedState.currentIndex || 0; // 【修改】默认选中中间列第1个（顶部），避免无索引时异常
        masteredWords = savedState.masteredWords; // 恢复左列（已牢记）单词
        untrainedWords = savedState.untrainedWords; // 恢复右列（待巩固）单词
        isMeaningHidden = savedState.isMeaningHidden || false;

        updateCounts();
        renderToReviewWords(toReviewWords);
        renderMasteredWords();
        renderUntrainedWords();
        activateCurrentWord(); // 初始激活中间列（记忆区）选中卡片
        bindEvents();
        enableAllControls();
        // 恢复中间列（记忆区）释义隐藏状态（无提示）
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
                toReviewWords = [...words]; // 初始化中间列（记忆区）单词
                currentIndex = 0; // 【修改】初始化默认选中中间列第1个卡片（顶部）
                updateCounts();
                renderToReviewWords(toReviewWords);
                renderMasteredWords();
                renderUntrainedWords();
                activateCurrentWord(); // 初始激活中间列（记忆区）选中卡片
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

    // 核心新增1：监听窗口大小变化，强制左右列滚动到顶部（左列=已牢记，右列=待巩固）
    window.addEventListener('resize', () => {
        // 窗口缩放时，延迟100ms执行（避免频繁触发）
        clearTimeout(window.resizeTimeout);
        window.resizeTimeout = setTimeout(() => {
            if (isInited) { // 确保应用已初始化
                forceScrollToTop(); // 强制左右列滚到顶部
                debouncedScrollToTarget(); // 【新增】窗口变化后，中间列（记忆区）高亮卡重新置顶
            }
        }, 100);
    });
}

// 核心修改2：强制左右列滚动到顶部（左列=已牢记，右列=待巩固；原forceScrollToBottom修改）
function forceScrollToTop() {
    // 左列（已牢记）强制滚到顶部
    if (masteredList.scrollHeight > 0) {
        masteredList.scrollTop = 0;
    }
    // 右列（待巩固）强制滚到顶部
    if (untrainedList.scrollHeight > 0) {
        untrainedList.scrollTop = 0;
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
        toReviewWords: toReviewWords, // 中间列（记忆区）单词当前顺序
        currentIndex: currentIndex,   // 中间列（记忆区）当前选中的位置
        masteredWords: masteredWords, // 左列（已牢记）单词
        untrainedWords: untrainedWords, // 右列（待巩固）单词
        isMeaningHidden: isMeaningHidden // 中间列（记忆区）释义隐藏状态
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

// 渲染中间列（记忆区）单词（仅卡片滚动，顶部固定）
function renderToReviewWords(wordArray) {
    wordListEl.innerHTML = '';
    if (wordArray.length === 0) {
        wordListEl.innerHTML = '<div class="empty-state">🎉 所有记忆区单词已分类完成！</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    wordArray.forEach((wordObj, index) => {
        // 兼容对象和字符串格式，正确渲染单词
        const wordText = typeof wordObj === 'object' && wordObj.word 
            ? wordObj.word 
            : String(wordObj);
        const card = createWordCard(wordText, index === currentIndex, 'word-card', false, true);
        fragment.appendChild(card);
    });
    wordListEl.appendChild(fragment);

    // 恢复中间列（记忆区）释义隐藏状态（无提示）
    if (isMeaningHidden) {
        hideMiddleTranslations();
    } else {
        showMiddleTranslations();
    }
}

// 渲染左列（已牢记）单词（始终滚动到顶部，最新单词在顶部）
function renderMasteredWords() {
    masteredList.innerHTML = '';
    if (masteredWords.length === 0) {
        masteredList.innerHTML = '<div class="empty-state">暂无已牢记单词<br>按←键或空格将中间单词移至此处</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    masteredWords.forEach((wordObj, index) => {
        const wordText = typeof wordObj === 'object' && wordObj.word 
            ? wordObj.word 
            : String(wordObj);
        const isLatest = index === 0; // 最新单词是数组第0个（顶部）
        const card = createWordCard(wordText, false, 'mastered-card', isLatest, false);
        fragment.appendChild(card);
    });
    masteredList.appendChild(fragment);

    // 强制滚动到顶部
    forceScrollToTop();
}

// 渲染右列（待巩固）单词（始终滚动到顶部，最新单词在顶部）
function renderUntrainedWords() {
    untrainedList.innerHTML = '';
    if (untrainedWords.length === 0) {
        untrainedList.innerHTML = '<div class="empty-state">暂无待巩固单词<br>按→键或输入正确后按Enter将中间单词移至此处</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    untrainedWords.forEach((wordObj, index) => {
        const wordText = typeof wordObj === 'object' && wordObj.word 
            ? wordObj.word 
            : String(wordObj);
        const isLatest = index === 0; // 最新单词是数组第0个（顶部）
        const card = createWordCard(wordText, false, 'untrained-card', isLatest, false);
        fragment.appendChild(card);
    });
    untrainedList.appendChild(fragment);

    // 强制滚动到顶部
    forceScrollToTop();
}

// 创建单词卡片（通用函数，匹配 JSON 的 type 字段）
function createWordCard(wordObj, isActive, cardClass, isLatest, isControlled) {
    const card = document.createElement('div');
    card.className = `${cardClass} ${isActive ? 'active' : ''} ${isLatest ? 'latest' : ''}`;
    if (isControlled) card.dataset.controlled = 'true';

    // 构建释义 HTML（若单词是对象且有释义，可扩展显示，此处保留原逻辑）
    let translationsHtml = '<div class="translations-container">';
    // 兼容对象格式的释义（若有）
    if (typeof wordObj === 'object' && wordObj.translations) {
        wordObj.translations.forEach(trans => {
            const transText = trans.translation || '';
            const meanings = transText.split('；').filter(mean => mean.trim());
            const posText = trans.type || '未知词性';
            meanings.forEach(mean => {
                translationsHtml += `
                    <div class="translation-item">
                        <span class="meaning">${mean.trim()}</span>
                        <span class="pos-tag">${posText}</span>
                    </div>
                `;
            });
        });
    } else {
        // 无释义时显示默认文本
        translationsHtml += `
            <div class="translation-item">
                <span class="meaning">无释义</span>
                <span class="pos-tag">未知词性</span>
            </div>
        `;
    }
    translationsHtml += '</div>';

    const wordText = typeof wordObj === 'object' && wordObj.word ? wordObj.word : String(wordObj);
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

// 激活当前单词（中间列（记忆区）高亮+置顶）
function activateCurrentWord() {
    const cards = document.querySelectorAll('.word-card');
    if (!cards[currentIndex]) return;

    // 高亮当前卡片
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));

    // 【修改】激活后立即置顶（原逻辑是对齐中点）
    debouncedScrollToTarget();

    updateCounts();
    saveStateToLocalStorage();
}































// 更新三列单词计数（格式：当前位置 | 总词数）
function updateCounts() {
    // 左列：已牢记单词数
    masteredCountEl.textContent = masteredWords.length;
    // 右列：待巩固单词数
    untrainedCountEl.textContent = untrainedWords.length;
    // 中间列：记忆区当前选中位置 | 总词数（位置从1开始）
    const total = toReviewWords.length;
    const currentPos = total > 0 ? currentIndex + 1 : 0;
    reviewCountEl.textContent = `${currentPos} | ${total}`;
}

// 切换单词（上下键）- 中间列（记忆区）切换后置顶
function switchWord(direction) {
    if (toReviewWords.length === 0) return;

    // 更新索引（边界保护）
    if (direction === 'up') {
        currentIndex = Math.max(0, currentIndex - 1);
    } else if (direction === 'down') {
        currentIndex = Math.min(toReviewWords.length - 1, currentIndex + 1);
    }

    // 高亮新卡片
    const cards = document.querySelectorAll('.word-card');
    cards.forEach((card, index) => card.classList.toggle('active', index === currentIndex));

    // 【修改】切换后立即置顶（原逻辑是对齐中点）
    debouncedScrollToTarget();

    // 【新增】切换单词后，输入框重新聚焦（方便继续输入）
    if (wordInput) wordInput.focus();

    updateCounts();
    saveStateToLocalStorage();
}

// 移至已牢记（左箭头/空格）- 新单词插入左列顶部，中间列（记忆区）高亮卡置顶
function moveToMastered() {
    if (toReviewWords.length === 0) return;

    const currentWordItem = toReviewWords[currentIndex];
    // 兼容对象和字符串格式，确保存储正确
    const currentWord = typeof currentWordItem === 'object' ? {...currentWordItem} : currentWordItem;
    
    masteredWords.unshift(currentWord); // 新单词插入左列（已牢记）顶部
    toReviewWords.splice(currentIndex, 1);

    // 边界保护：删除后若中间列（记忆区）还有单词，保持当前索引；若无则置0
    if (toReviewWords.length > 0) {
        currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    } else {
        currentIndex = 0;
    }

    renderToReviewWords(toReviewWords);
    renderMasteredWords();
    updateCounts();
    saveStateToLocalStorage();

    // 【修改】重新渲染后，中间列（记忆区）高亮卡置顶（原逻辑是恢复滚动位置）
    if (toReviewWords.length > 0) {
        debouncedScrollToTarget();
    } else {
        isAutoScroll = false;
    }

    // 【新增】操作后输入框重新聚焦
    if (wordInput) wordInput.focus();
}

// 移至待巩固（右箭头/输入正确后Enter）- 新单词插入右列顶部，中间列（记忆区）高亮卡置顶
function moveToUntrained() {
    if (toReviewWords.length === 0) return;

    const currentWordItem = toReviewWords[currentIndex];
    const currentWord = typeof currentWordItem === 'object' ? {...currentWordItem} : currentWordItem;
    
    untrainedWords.unshift(currentWord); // 新单词插入右列（待巩固）顶部
    toReviewWords.splice(currentIndex, 1);

    // 边界保护：删除后若中间列（记忆区）还有单词，保持当前索引；若无则置0
    if (toReviewWords.length > 0) {
        currentIndex = Math.min(currentIndex, toReviewWords.length - 1);
    } else {
        currentIndex = 0;
    }

    renderToReviewWords(toReviewWords);
    renderUntrainedWords();
    updateCounts();
    saveStateToLocalStorage();

    // 【修改】重新渲染后，中间列（记忆区）高亮卡置顶（原逻辑是恢复滚动位置）
    if (toReviewWords.length > 0) {
        debouncedScrollToTarget();
    } else {
        isAutoScroll = false;
    }

    // 【新增】操作后输入框重新聚焦
    if (wordInput) wordInput.focus();
}

// 随机打乱单词顺序（中间列=记忆区）
function shuffleToReviewWords() {
    if (toReviewWords.length === 0) return;

    toReviewWords = [...toReviewWords].sort(() => Math.random() - 0.5);
    currentIndex = 0; // 【修改】打乱后默认选中中间列（记忆区）第1个（顶部）卡片，置顶显示

    wordListEl.innerHTML = `
        <div style="text-align: center; padding: 80px 20px; color: #4299e1; font-size: 18px;">
            ⏳ 正在打乱单词顺序...
        </div>
    `;

    setTimeout(() => {
        renderToReviewWords(toReviewWords);
        debouncedScrollToTarget(); // 【修改】打乱后中间列（记忆区）高亮卡置顶
        updateCounts();
        saveStateToLocalStorage();
        feedbackEl.textContent = '';
        // 【新增】打乱后输入框重新聚焦
        if (wordInput) wordInput.focus();
    }, 300);
}

// 隐藏中间列（记忆区）所有释义
function hideMiddleTranslations() {
    isMeaningHidden = true;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.add('hidden'));
    toggleBtn.textContent = '显示释义';
    saveStateToLocalStorage();
}

// 显示中间列（记忆区）所有释义
function showMiddleTranslations() {
    isMeaningHidden = false;
    const middleMeanings = document.querySelectorAll('[data-controlled="true"] .meaning');
    middleMeanings.forEach(el => el.classList.remove('hidden'));
    toggleBtn.textContent = '隐藏释义';
    saveStateToLocalStorage();
}

// 切换中间列（记忆区）释义显示/隐藏
function toggleMeaning() {
    if (isMeaningHidden) {
        showMiddleTranslations();
    } else {
        hideMiddleTranslations();
    }
}

// 绑定核心交互事件（含字母键自动聚焦、按键防覆盖）
function bindEvents() {
    // 1. 全局按键事件（输入框未聚焦时）
    document.addEventListener('keydown', (e) => {
        // 输入框聚焦时，不干扰其自身的按键逻辑
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // 拦截功能键长按连续触发
        const forbiddenKeys = ['ArrowUp', 'ArrowDown', ' ', 'Enter', 'ArrowLeft', 'ArrowRight'];
        if (forbiddenKeys.includes(e.key) && e.repeat) {
            e.preventDefault();
            return;
        }

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                moveToMastered(); // 左箭头：移至已牢记
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveToUntrained(); // 右箭头：移至待巩固
                break;
            case 'ArrowUp':
                e.preventDefault();
                switchWord('up'); // 向上切换单词
                break;
            case 'ArrowDown':
                e.preventDefault();
                switchWord('down'); // 向下切换单词
                break;
            case ' ':
                e.preventDefault();
                moveToMastered(); // 空格：移至已牢记
                break;
            case 'Enter':
                e.preventDefault();
                // 输入框未聚焦时，Enter键不执行操作
                break;
            default:
                break;
        }
    });

    // 2. 新增：全局字母/数字键监听，未聚焦时自动激活输入框并输入
    document.addEventListener('keydown', (e) => {
        // 排除功能键，仅响应字母、数字键
        const isLetterOrNumber = /^[a-zA-Z0-9]$/.test(e.key);
        // 输入框未聚焦时才触发
        if (isLetterOrNumber && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault(); // 阻止字符无意义地输入到页面
            wordInput.focus(); // 激活输入框
            // 将按下的键追加到输入框内容中
            wordInput.value += e.key;
        }
    });

    // 3. 按钮事件绑定
    toggleBtn.addEventListener('click', toggleMeaning); // 释义切换
    shuffleBtn.addEventListener('click', shuffleToReviewWords); // 随机顺序

    // 4. 滚动同步选中逻辑
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
            // 滚动切换后输入框聚焦
            if (wordInput) wordInput.focus();
            updateCounts();
            saveStateToLocalStorage();
        }
    });
}

// 页面加载完成后初始化
window.addEventListener('load', bindInitEvents);