
      let currentCharacterIndex = 0;
let currentRound = 1;
let charactersData = []; // Хранение загруженных данных о персонажах

// Функция для загрузки данных из JSON-файла
function loadInitiativeData() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/static/data.json", true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            currentRound = data.round;
            currentCharacterIndex = data.try;
            charactersData = data.all;
            displayInfoBlocks(data);
            displayCharacters();
        }
    };
    xhr.send();
}

// Функция для отправки данных на сервер
function sendInit() {
    const dataToSend = {
        round: currentRound,
        try: currentCharacterIndex,
        all: charactersData
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/config/init", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(dataToSend));
}

// Функция отображения информационных блоков
function displayInfoBlocks(data) {
    document.getElementById('current-round').textContent = data.round;
    document.getElementById('battle-rating').textContent = data.rating;
}

// Переход к следующему персонажу
function nextTurn() {
    // Упорядочиваем персонажей по инициативе (по убыванию)
    const characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));
    let next = charactersData.filter(character => parseFloat(character.init) < currentCharacterIndex)[0] || characters[0];

    // Если возвращаемся к первому персонажу, увеличиваем счетчик раунда
    currentCharacterIndex = next.init;
    if (next.init == characters[0].init) {
        currentRound++;
    }

    // Обновляем информацию о текущем и следующем персонаже
    displayCharacters();
    sendInit(); // Отправка данных на сервер после перехода хода
}

// Обновление информации о текущем и следующем персонаже
function displayCurrentAndNextTurn() {
    const characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

    const currentCharacter = characters.find(character => parseFloat(character.init) == currentCharacterIndex);
    const nextCharacter = characters.find(character => parseFloat(character.init) < currentCharacterIndex) || characters[0];

    document.getElementById('current-round').textContent = currentRound;
    document.getElementById('current-turn').textContent = currentCharacter.name;
    document.getElementById('next-turn').textContent = nextCharacter.name;
}

// Модифицированная функция для отображения строк персонажей с подсветкой текущего
function displayCharacters() {
    const container = document.getElementById('characters-container');
    container.innerHTML = '';

    const characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

    characters.forEach((character, index) => {
        const row = document.createElement('div');
        row.classList.add('character-row');

        if (character.init === currentCharacterIndex) {
            row.classList.add('current-turn');
        }

        row.innerHTML = `
            <span>Инициатива: <input type="text" value="${character.init}" onchange="updateCharacterInit(${index}, this.value)" /></span>
            <span>Имя: ${character.name}</span>
            <span>КД: ${character.cd}</span>
            <span>HP: <span class="hp-now"><input type="text" value="${character.hp_now}" onchange="updateCharacterHp(${index}, this.value)" /></span> / ${character.hp_max}</span>
            <label>Сюрприз: <input type="checkbox" ${character.surprise === "true" ? "checked" : ""} /></label>
            <button onclick="deleteCharacter(${index})">-</button>
            <button onclick="healCharacter(${index})">+</button>
        `;
        container.appendChild(row);
    });
    displayCurrentAndNextTurn();
}

// Функция обновления инициативы персонажа
function updateCharacterInit(index, value) {
    charactersData[index].init = value;
    displayCharacters();
    sendInit(); // Отправка данных на сервер при обновлении инициативы
}

// Функция обновления здоровья персонажа
function updateCharacterHp(index, value) {
    charactersData[index].hp_now = value;
    displayCharacters();
    sendInit(); // Отправка данных на сервер при обновлении здоровья
}

// Функция сброса инициативы
function resetInitiative() {
    charactersData.forEach((character) => {
        character.init = '';
    });
    displayCharacters();
    sendInit(); // Отправка данных на сервер после сброса инициативы
}

// Функция восстановления здоровья
function healCharacter(index) {
    const character = charactersData[index];
    character.hp_now = character.hp_max;
    displayCharacters();
    sendInit(); // Отправка данных на сервер после восстановления здоровья
}

// Функция удаления строки персонажа
function deleteCharacter(index) {
    charactersData.splice(index, 1);
    displayCharacters();
    sendInit(); // Отправка данных на сервер после удаления персонажа
}

// Функция переключения видимости формы добавления персонажа
function toggleAddCharacterForm() {
    const form = document.getElementById('add-character-form');
    form.style.display = form.style.display === 'none' || form.style.display === '' ? 'block' : 'none';
}

function isUniqueInitiative(init, characters) {
    return !characters.some(character => parseFloat(character.init) === parseFloat(init));
}

// Функция добавления нового персонажа
function addCharacter() {
    let init = document.getElementById('new-init').value;
    const name = document.getElementById('new-name').value;
    const cd = document.getElementById('new-cd').value;
    const hpNow = document.getElementById('new-hp-now').value;
    const hpMax = document.getElementById('new-hp-max').value;
    const surprise = document.getElementById('new-surprise').checked;

    // Проверяем уникальность инициативы
    while (!isUniqueInitiative(init, charactersData)) {
        init = (parseFloat(init) + 0.01).toFixed(2); // Увеличиваем инициативу на 0,01 и округляем до 2 знаков
    }

    const newCharacter = {
        init: init,
        name: name,
        cd: cd,
        hp_now: hpNow,
        hp_max: hpMax,
        surprise: surprise ? "true" : "false"
    };

    charactersData.push(newCharacter);
    displayCharacters();
    toggleAddCharacterForm();
    sendInit(); // Отправка данных на сервер после добавления персонажа
}

// Запуск функции загрузки данных при загрузке страницы
window.onload = loadInitiativeData;