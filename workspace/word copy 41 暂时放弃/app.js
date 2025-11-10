// 核心变量定义（全局状态管理）
let currentIndex = 0; // 当前选中的待巩固单词索引
let isAnimating = false; // 动画锁：防止连续操作导致混乱
// 单词分组存储：按分类管理（已牢记/待巩固/待记忆）
let wordGroups = {
    mastered: [],
    pending: [],
    untrained: []
};

// DOM 元素缓存（一次性查询，提升性能）
const wordListEl = document.getElementById('wordList');
const reviewContent = document.getElementById('reviewContent');
const masteredList = document.getElementById('masteredList');
const untrainedList = document.getElementById('untrainedList');
const reviewCountEl = document.getElementById('reviewCount');
const masteredCountEl = document.getElementById('masteredCount');
const untrainedCountEl = document.getElementById('untrainedCount');

// 初始化函数：加载外部JSON+启动应用
async function init() {
    try {
        // 加载外部 Vocabulary.json（需与HTML同目录）
        const response = await fetch('Vocabulary.json');
        if (!response.ok) {
            throw new Error(`文件加载失败（状态码：${response.status}）`);
        }
        const allWords = await response.json();
        // 初始所有单词存入「待巩固」组
        wordGroups.pending = [...allWords];

        // 初始化界面流程
        updateCounts(); // 更新三列单词计数
        renderPendingWords(); // 渲染中间列待巩固单词
        bindKeyboardEvents(); // 绑定键盘操作事件
        syncScroll(); // 启动三列滚动同步

        // 初始定位：将第一个单词移至容器2/3处
        setTimeout(() => {
            if (wordGroups.pending.length > 0) {
                highlightActiveCard();
                centerActiveCard(false);
            }
        }, 100);
    } catch (error) {
        // 加载失败友好提示
        wordListEl.innerHTML = `
            <div class="empty-state">
                ❌ 加载失败<br>
                ${error.message}<br>
                请检查JSON文件路径和格式
            </div>
        `;
        console.error('初始化错误：', error);
    }
}

// 渲染中间列「待巩固」单词列表（多单词排列）
function renderPendingWords() {
    if (wordGroups.pending.length === 0) {
        wordListEl.innerHTML = '<div class="empty-state">🎉 所有单词已分类完成！</div>';
        return;
    }

    let html = '';
    wordGroups.pending.forEach((wordObj, index) => {
        const word = wordObj.word || '无单词'; // 兼容异常数据
        // 当前选中的单词添加 active 类高亮
        html += `<div class="word-card pending ${index === currentIndex ? 'active' : ''}" data-index="${index}">${word}</div>`;
    });
    wordListEl.innerHTML = html;
    updateEmptyStates(); // 同步更新左右列空状态
}

// 渲染左右列「分类单词」（已牢记/待记忆）
function renderCategoryWords(targetList, groupName) {
    const words = wordGroups[groupName];
    if (words.length === 0) {
        // 空状态提示（显示对应操作按键）
        targetList.innerHTML = `
            <div class="empty-state">
                暂无单词<br>
                按${groupName === 'mastered' ? '←' : '→'}键移动至此
            </div>
        `;
        return;
    }

    // 非空状态：渲染所有分类单词
    let html = '';
    words.forEach((wordObj) => {
        const word = wordObj.word || '无单词';
        html += `<div class="word-card ${groupName}">${word}</div>`;
    });
    targetList.innerHTML = html;
}

// 更新三列单词计数显示
function updateCounts() {
    masteredCountEl.textContent = wordGroups.mastered.length;
    reviewCountEl.textContent = wordGroups.pending.length;
    untrainedCountEl.textContent = wordGroups.untrained.length;
}

// 更新左右列空状态（联动分类渲染）
function updateEmptyStates() {
    renderCategoryWords(masteredList, 'mastered');
    renderCategoryWords(untrainedList, 'untrained');
}

// 高亮当前选中的待巩固单词
function highlightActiveCard() {
    document.querySelectorAll('.word-card.pending').forEach((card, index) => {
        card.classList.toggle('active', index === currentIndex);
    });
}

// 三列滚动同步（确保平移时顶端对齐的基础）
function syncScroll() {
    const columns = [reviewContent, masteredList, untrainedList];
    columns.forEach((col) => {
        col.addEventListener('scroll', (e) => {
            if (isAnimating) return; // 动画期间暂停同步，避免冲突
            const scrollTop = e.target.scrollTop;
            // 同步其他两列的滚动位置
            columns.forEach((otherCol) => {
                if (otherCol !== e.target) {
                    otherCol.scrollTop = scrollTop;
                }
            });
        });
    });
}

// 中间列激活卡片定位到容器2/3高度处（从上往下）
function centerActiveCard(useSmooth = false) {
    const activeCard = document.querySelector('.word-card.pending.active');
    if (!activeCard) return;

    const scrollContainer = reviewContent;
    const containerHeight = scrollContainer.clientHeight;
    const cardOffsetTop = activeCard.offsetTop;

    // 核心公式：滚动位置 = 卡片顶部距离 - 容器2/3高度
    const targetScrollTop = cardOffsetTop - containerHeight * (2/3);
    const finalScrollTop = Math.max(0, targetScrollTop); // 避免负滚动

    if (useSmooth) {
        scrollContainer.scrollTo({
            top: finalScrollTop,
            behavior: 'smooth'
        });
    } else {
        scrollContainer.scrollTop = finalScrollTop;
    }
}






















// 绑定键盘操作事件（核心交互入口）
function bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
        if (isAnimating || wordGroups.pending.length === 0) return;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                moveCard('mastered');
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveCard('untrained');
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    currentIndex--;
                    highlightActiveCard();
                    centerActiveCard(true);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < wordGroups.pending.length - 1) {
                    currentIndex++;
                    highlightActiveCard();
                    centerActiveCard(true);
                }
                break;
        }
    });
}

// 核心逻辑：单词平移+顶端对齐+直接显示最新单词（无多余动画）
function moveCard(toGroup) {
    isAnimating = true;
    const oldIndex = currentIndex;
    const currentWord = wordGroups.pending[oldIndex];
    const activeCard = document.querySelector(`.word-card.pending[data-index="${oldIndex}"]`);

    if (!activeCard) {
        isAnimating = false;
        return;
    }

    // 1. 获取当前卡片位置（顶端对齐基准）
    const cardRect = activeCard.getBoundingClientRect();
    const cardTop = cardRect.top;
    const cardWidth = cardRect.width;

    // 2. 创建临时卡片（仅做平移动画，不参与目标列布局）
    const tempCard = document.createElement('div');
    tempCard.className = 'word-card pending';
    tempCard.textContent = currentWord.word || '无单词';
    tempCard.style.cssText = `
        position: fixed;
        top: ${cardTop}px;
        left: ${cardRect.left}px;
        width: ${cardWidth}px;
        z-index: 9999;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    document.body.appendChild(tempCard);

    // 3. 隐藏原卡片，触发平移动画（直接指向目标列视野位置）
    activeCard.style.opacity = 0;
    const targetColumn = toGroup === 'mastered' ? masteredList : untrainedList;
    // 计算目标列“可见区域底部”位置（确保临时卡片平移后刚好在视野内）
    const columnRect = targetColumn.getBoundingClientRect();
    const targetLeft = toGroup === 'mastered' ? columnRect.left + (columnRect.width - cardWidth)/2 : columnRect.right - (columnRect.width + cardWidth)/2;
    const targetTop = columnRect.bottom - cardRect.height - 20; // 底部留20px间距

    // 直接触发平移动画到目标列可见位置
    setTimeout(() => {
        tempCard.style.left = `${targetLeft}px`;
        tempCard.style.top = `${targetTop}px`;
        tempCard.style.opacity = 1;
        tempCard.style.transform = 'scale(1)';
        tempCard.classList.add(toGroup);
    }, 10);

    // 4. 动画中期（200ms）：更新数据+目标列滚动到底部
    setTimeout(() => {
        // 数据更新
        wordGroups.pending.splice(oldIndex, 1);
        wordGroups[toGroup].push(currentWord);

        // 视图更新（先滚动再渲染，确保最新单词在底部）
        targetColumn.scrollTop = targetColumn.scrollHeight; // 提前滚动到底部
        updateCounts();
        renderPendingWords();
        updateEmptyStates();

        // 中间列更新
        if (wordGroups.pending.length > 0) {
            currentIndex = Math.min(oldIndex, wordGroups.pending.length - 1);
            highlightActiveCard();
            centerActiveCard(false);
        }
    }, 200);

    // 5. 动画结束（400ms）：移除临时卡片，恢复状态
    setTimeout(() => {
        tempCard.remove();
        activeCard.style.opacity = 1;
        isAnimating = false;
        // 二次确认滚动（确保渲染后仍在底部）
        targetColumn.scrollTop = targetColumn.scrollHeight;
        syncScroll();
    }, 400);
}

// 启动应用
init();