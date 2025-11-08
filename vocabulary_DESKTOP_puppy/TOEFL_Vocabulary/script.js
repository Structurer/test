const wordTable = document.getElementById('wordTable');
const nextButton = document.getElementById('nextButton');
let wordData = [];

// 从外部 JSON 文件加载数据
fetch('Vocabulary.json')
  .then(response => {
        if (!response.ok) {
            throw new Error('网络响应不正常');
        }
        return response.json();
    })
  .then(data => {
        wordData = data;
        displayRandomWord();
        // 每隔 1 分钟（60000 毫秒）切换一次单词信息
        setInterval(() => {
            displayRandomWord();
        }, 60000);
    })
  .catch(error => {
        console.error('加载 JSON 文件时出错:', error);
    });

function displayRandomWord() {
    // 清空表格内容
    wordTable.innerHTML = '';

    const randomIndex = Math.floor(Math.random() * wordData.length);
    const wordInfo = wordData[randomIndex];
    const wordRow = document.createElement('tr');
    const wordCell = document.createElement('td');
    wordCell.innerHTML = `<span class="word">${wordInfo.word}</span>`;
    wordRow.appendChild(wordCell);
    wordTable.appendChild(wordRow);

    wordInfo.translations.forEach(translationInfo => {
        const typeRow = document.createElement('tr');
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `<span class="type">${translationInfo.type}</span>. <span class="meaning">${translationInfo.translation}</span>`;
        typeRow.appendChild(typeCell);
        wordTable.appendChild(typeRow);
    });
}

// 按钮点击事件监听器，手动切换到下一个随机单词
nextButton.addEventListener('click', () => {
    displayRandomWord();
});