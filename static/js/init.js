
let currentCharacterIndex = 0;
let currentRound = 0;
let charactersData = []; // Хранение загруженных данных о персонажах
let rating = 0; //Рейтинг опасности
let nextCharacterIndex = 0; //Рейтинг опасности

// Функция для загрузки данных из JSON-файла
function loadInitiativeData() {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/config/init", true);
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
        all: charactersData,
        rating: rating,
        next: nextCharacterIndex,
    };

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/config/init", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(dataToSend));
}

// Функция отображения информационных блоков
function displayInfoBlocks(data) {
    document.getElementById('current-round').textContent = data.round;
    document.getElementById('battle-rating').textContent = rating;
}

// Универсальная функция для обновления свойств персонажа
function updateCharacterProperty(index, property, value) {
    charactersData[index][property] = value;
    displayCharacters();
    sendInit();
}

// Переход к следующему персонажу
function nextTurn() {
    // Упорядочиваем персонажей по инициативе (по убыванию)
    let characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));
    let _characters = characters;

    if (currentRound === 0) {
        // Если раунд сюрприз, фильтруем только персонажей с `surprise: true`
        characters = characters.filter(character => character.surprise === "true");
    }

    let next = characters.filter(character => parseFloat(character.init) < currentCharacterIndex)[0] || _characters[0];

    // Если возвращаемся к первому персонажу, увеличиваем счетчик раунда
    currentCharacterIndex = next.init;
    if (next.init == characters[0].init) {
        currentRound++;
    }

    // Обновляем информацию о текущем и следующем персонаже
    displayCharacters();
    sendInit(); // Отправка данных на сервер после перехода хода
}


// Переход к предыдущему персонажу
function prevTurn() {
    // Упорядочиваем персонажей по инициативе (по убыванию)
    let characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

    if (currentRound === 0) {
        // Если раунд сюрприз, фильтруем только персонажей с `surprise: true`
        characters = characters.filter(character => character.surprise === "true");
    }

    // Находим текущего персонажа и предыдущего по инициативе
    let currentIndex = characters.findIndex(character => parseFloat(character.init) === parseFloat(currentCharacterIndex));

    // Если текущий персонаж первый, нужно вернуться к последнему персонажу и уменьшить раунд
    if (currentIndex === 0) {
        currentCharacterIndex = characters[characters.length - 1].init;
        currentRound = Math.max(0, currentRound - 1); // Уменьшаем раунд, но не меньше 0
    } else {
        // В противном случае, переходим к предыдущему персонажу
        currentCharacterIndex = characters[currentIndex - 1].init;
    }

    // Обновляем информацию о текущем и следующем персонаже
    displayCharacters();
    sendInit(); // Отправка данных на сервер после перехода хода назад
}


// Обновление информации о текущем и следующем персонаже
function displayCurrentAndNextTurn() {
    const characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

    const currentCharacter = characters.find(character => parseFloat(character.init) == currentCharacterIndex);
    const nextCharacter = characters.find(character => parseFloat(character.init) < currentCharacterIndex) || characters[0];
    nextCharacterIndex = nextCharacter.init;
    document.getElementById('current-round').textContent = currentRound;
    if (currentCharacter) document.getElementById('current-turn').textContent = currentCharacter.name;
    if (nextCharacter) document.getElementById('next-turn').textContent = nextCharacter.name;
}

// Модифицированная функция для отображения строк персонажей с подсветкой текущего
function displayCharacters() {
    const container = document.getElementById('characters-container');
    container.innerHTML = '';

    let {encounterDifficulty} = calculateEncounterData(charactersData);
    document.getElementById('battle-rating').textContent = encounterDifficulty;
    rating = encounterDifficulty;
    const characters = charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

    characters.forEach((character, index) => {
        const row = document.createElement('div');
        row.classList.add('character-row');

        if (character.init === currentCharacterIndex) {
            row.classList.add('current-turn');
        }

        row.classList.add(character.npc === 'true' ? 'character-npc' : 'character-player');

        // Поле инициативы с вызовом window.prompt при клике
        const initSpan = document.createElement('span');
        initSpan.textContent = `Init: ${character.init}`;
        initSpan.onclick = () => {
            const newValue = window.prompt("Введите новое значение инициативы:", character.init);
            if (newValue !== null && !isNaN(newValue)) {
                updateCharacterProperty(index, "init", parseFloat(newValue));
            }
        };

        // Поле имени
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `Имя: ${character.name}`;
        nameSpan.style.width = '15%'
        nameSpan.onclick = () => {
            const newValue = window.prompt("Введите новое имя:", character.name);
            if (newValue !== null) {
                updateCharacterProperty(index, "name", newValue);
            }
        };

        // Поле КД (не редактируемое)
        const cdSpan = document.createElement('span');
        cdSpan.textContent = `КД: ${character.cd}`;
        cdSpan.onclick = () => {
            const newValue = window.prompt("Введите новое значение КД:", character.cd);
            if (newValue !== null && !isNaN(newValue)) {
                updateCharacterProperty(index, "cd", newValue);
            }
        };

        // Поле текущего HP с вызовом window.prompt при клике
        const hpSpan = document.createElement('span');
        hpSpan.innerHTML = `HP: <span class="hp-now">${character.hp_now}</span> / ${character.hp_max}`;
        hpSpan.onclick = () => {
            const newValue = window.prompt("Введите новое значение текущего HP:", character.hp_now);
            if (newValue !== null && !isNaN(newValue)) {
                updateCharacterProperty(index, "hp_now", newValue);
            }
        };

        // Поле сюрприза (чекбокс)
        const surpriseLabel = document.createElement('label');
        surpriseLabel.innerHTML = `Sur: <input type="checkbox" ${character.surprise === "true" ? "checked" : ""} onchange="updateCharacterProperty(${index}, 'surprise', this.checked ? 'true' : 'false')" />`;

        // Поле НПС (чекбокс)
        const npcLabel = document.createElement('label');
        npcLabel.innerHTML = `НПС: <input type="checkbox" ${character.npc === "true" ? "checked" : ""} onchange="updateCharacterProperty(${index}, 'npc', this.checked ? 'true' : 'false')" />`;

        // Поле опыта с вызовом window.prompt при клике
        const expSpan = document.createElement('span');
        let expSpanTitle = character.npc ? 'EXP' : 'LVL';
        expSpan.innerHTML = `${expSpanTitle}: ${character.exp}`;
        expSpan.onclick = () => {
            const newValue = window.prompt("Введите новое значение опыта:", character.exp);
            if (newValue !== null && !isNaN(newValue)) {
                updateCharacterProperty(index, "exp", newValue);
            }
        };

        // Кнопки удаления и восстановления здоровья
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '-';
        deleteButton.onclick = () => deleteCharacter(index);

        const healButton = document.createElement('button');
        healButton.textContent = '+';
        healButton.onclick = () => healCharacter(index);

        // Добавляем все элементы в строку
        row.appendChild(nameSpan);
        row.appendChild(initSpan);
        row.appendChild(cdSpan);
        row.appendChild(hpSpan);
        row.appendChild(surpriseLabel);
        row.appendChild(npcLabel);
        row.appendChild(expSpan);
        row.appendChild(deleteButton);
        row.appendChild(healButton);

        container.appendChild(row);
    });

    displayCurrentAndNextTurn();
}

// Функция сброса инициативы
function resetInitiative() {
    // Сбрасываем инициативу всех персонажей в пустую строку
    charactersData.forEach((character, index) => {
        charactersData[index].init = '';  // Инициатива становится пустой строкой
    });

    // Сбрасываем раунд на 0
    currentRound = 0;

    // Обновляем отображение данных
    displayCharacters();

    // Отправляем обновленные данные на сервер
    sendInit();
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
    const npc = document.getElementById('new-npc').checked; // Получаем значение НПС
    const exp = document.getElementById('new-experience').value; // Получаем значение НПС

    // Проверяем уникальность инициативы
    while (!isUniqueInitiative(init, charactersData)) {
        init = (parseFloat(init) + 0.1).toFixed(2); // Увеличиваем инициативу на 0,01 и округляем до 2 знаков
    }

    const newCharacter = {
        init: init,
        name: name,
        cd: cd,
        hp_now: hpNow,
        hp_max: hpMax,
        exp: exp,
        surprise: surprise ? "true" : "false",
        npc: npc ? "true" : "false" // Добавляем признак НПС
    };

    charactersData.push(newCharacter);
    displayCharacters();
    toggleAddCharacterForm();
    sendInit(); // Отправка данных на сервер после добавления персонажа
}


// Функция для расчета сложности столкновения
function calculateEncounterData(characters) {
    const ENCOUNTER_EASY = 0,
          ENCOUNTER_MEDIUM = 1,
          ENCOUNTER_HARD = 2,
          ENCOUNTER_DEADLY = 3;

    const xpThresholdsByLevel = {
        1: [25, 50, 75, 100],
        2: [50, 100, 150, 200],
        3: [75, 150, 225, 400],
        4: [125, 250, 375, 500],
        5: [250, 500, 750, 1100],
        6: [300, 600, 900, 1400],
        7: [350, 750, 1100, 1700],
        8: [450, 900, 1400, 2100],
        9: [550, 1100, 1600, 2400],
        10: [600, 1200, 1900, 2800],
        11: [800, 1600, 2400, 3600],
        12: [1000, 2000, 3000, 4500],
        13: [1100, 2200, 3400, 5100],
        14: [1250, 2500, 3800, 5700],
        15: [1400, 2800, 4300, 6400],
        16: [1600, 3200, 4800, 7200],
        17: [2000, 3900, 5900, 8800],
        18: [2100, 4200, 6300, 9500],
        19: [2400, 4900, 7300, 10900],
        20: [2800, 5700, 8500, 12700]
    };

    const danger = {
        "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100,
        "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200,
        "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000,
        "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000,
        "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000,
        "30": 155000
    };

    // Массив множителей на основе количества врагов
    const factor = [1, 1.5, 2, 2.5, 3, 4];

    let playerTotal = 0;
    let masterTotal = 0;
    let totalExp = 0;
    let difficultyThresholds = [0, 0, 0, 0];
    let encounterDifficulty = 0;

    // 1. Рассчитываем пороги сложности для всей группы
    characters.forEach(character => {
        const isNpc = character.npc === "true";
        const levelOrDanger = parseInt(character.exp);

        if (isNpc) {
            // Увеличиваем количество врагов и суммарный опыт врагов
            masterTotal += 1;
            totalExp += danger[levelOrDanger] || 0;
        } else {
            // Увеличиваем пороговые значения сложности отряда на основе уровня игрока
            playerTotal += 1;
            if (xpThresholdsByLevel[levelOrDanger]) {
                difficultyThresholds[ENCOUNTER_EASY] += xpThresholdsByLevel[levelOrDanger][ENCOUNTER_EASY];
                difficultyThresholds[ENCOUNTER_MEDIUM] += xpThresholdsByLevel[levelOrDanger][ENCOUNTER_MEDIUM];
                difficultyThresholds[ENCOUNTER_HARD] += xpThresholdsByLevel[levelOrDanger][ENCOUNTER_HARD];
                difficultyThresholds[ENCOUNTER_DEADLY] += xpThresholdsByLevel[levelOrDanger][ENCOUNTER_DEADLY];
            }
        }
    });

    // 2. Определение множителя сложности
    let factorId;
    if (masterTotal === 1) {
        factorId = 1;
    } else if (masterTotal === 2) {
        factorId = 1.5;
    } else if (masterTotal >= 3 && masterTotal <= 6) {
        factorId = 2;
    } else if (masterTotal >= 7 && masterTotal <= 10) {
        factorId = 2.5;
    } else if (masterTotal >= 11 && masterTotal <= 14) {
        factorId = 3;
    } else {
        factorId = 4;
    }

    // Корректируем множитель для малых или больших групп
    if (playerTotal < 3) {
        factorId = Math.min(factorId + 1, 4); // применяем следующий множитель
    } else if (playerTotal >= 6) {
        factorId = Math.max(factorId - 1, 0.5); // предыдущий множитель
    }

    // 3. Рассчитываем итоговый опыт с учетом множителя
    const adjustedExp = totalExp * factorId;

    // 4. Определяем уровень сложности на основе суммарного опыта врагов
    if (adjustedExp <= difficultyThresholds[ENCOUNTER_EASY]) {
        encounterDifficulty = ENCOUNTER_EASY;
    } else if (adjustedExp <= difficultyThresholds[ENCOUNTER_MEDIUM]) {
        encounterDifficulty = ENCOUNTER_MEDIUM;
    } else if (adjustedExp <= difficultyThresholds[ENCOUNTER_HARD]) {
        encounterDifficulty = ENCOUNTER_HARD;
    } else {
        encounterDifficulty = ENCOUNTER_DEADLY;
    }

    // Возвращаем пороги сложности, итоговую сложность, суммарный опыт и примененный множитель
    return {
        difficultyThresholds,
        encounterDifficulty,
        adjustedExp,
        factorId
    };
}

// Запуск функции загрузки данных при загрузке страницы
window.onload = loadInitiativeData;
document.querySelector(".toggle-form-button.reset").addEventListener("click", resetInitiative);
document.querySelector(".toggle-form-button.next").addEventListener("click", nextTurn);
document.querySelector(".toggle-form-button.prev").addEventListener("click", prevTurn);