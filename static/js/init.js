import {calculateEncounterData} from './init/func.js';
import {displayInfoBlocks,displayCurrentAndNextTurn} from './init/display.js';
import {loadInitiativeData, sendInit} from './init/api.js';


function createEditableSpan(content, property, index, callback, after='') {
    // Разделяем текст на лейбл и значение
    const [label, value] = content.split(': ');

    // Создаем span для лейбла, который будет неизменным
    const labelSpan = document.createElement('span');
    labelSpan.textContent = `${label}: `;

    // Создаем span для лейбла, который будет неизменным
    const afterSpan = document.createElement('span');
    afterSpan.textContent = after;

    // Создаем span для значения, которое будет редактируемым
    const valueSpan = document.createElement('span');
    valueSpan.textContent = value;
    valueSpan.classList.add('editable-value');
    valueSpan.onclick = () => {
        const newValue = window.prompt(`Введите новое значение для ${property}:`, valueSpan.textContent);
        if (newValue !== null) {
            valueSpan.textContent = newValue;
            callback(index, property, newValue);
        }
    };

    // Оборачиваем лейбл и значение в общий контейнер
    const containerSpan = document.createElement('span');
    containerSpan.append(labelSpan, valueSpan, afterSpan);

    return containerSpan;
}

class InitiativeManager {
    constructor() {
        this.currentCharacterIndex = 0;
        this.currentRound = 0;
        this.charactersData = [];
        this.rating = 0;
        this.nextCharacterIndex = 0;

        // Привязка обработчиков событий
        this.addEventListeners();
    }

    // Функция для загрузки данных из JSON-файла
    loadInitiativeData() {
        loadInitiativeData.call(this);
    }

    displayInfoBlocks() {
        displayInfoBlocks.call(this);
    }

    // Функция для отправки данных на сервер
    sendInit() {
        sendInit.call(this);
    }

    // Универсальная функция для обновления свойств персонажа
    updateCharacterProperty(index, property, value) {
console.log('Before update:', this.charactersData[index]);

        this.charactersData[index][property] = value;
        console.log(`Updating ${property} to ${value}`);
        this.displayCharacters();
        this.sendInit();
        console.log('After update:', this.charactersData[index]);

    }

    // Переход к следующему персонажу
    nextTurn() {
        let characters = this.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));
        let _characters = characters;

        if (this.currentRound === 0) {
            characters = characters.filter(character => character.surprise === "true");
        }

        let next = characters.filter(character => parseFloat(character.init) < this.currentCharacterIndex)[0] || _characters[0];

        this.currentCharacterIndex = next.init;
        if (next.init == characters[0].init) {
            this.currentRound++;
        }

        this.displayCharacters();
        this.sendInit();
    }

    // Переход к предыдущему персонажу
    prevTurn() {
        let characters = this.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

        if (this.currentRound === 0) {
            characters = characters.filter(character => character.surprise === "true");
        }

        let currentIndex = characters.findIndex(character => parseFloat(character.init) === parseFloat(this.currentCharacterIndex));

        if (currentIndex === 0) {
            this.currentCharacterIndex = characters[characters.length - 1].init;
            this.currentRound = Math.max(0, this.currentRound - 1);
        } else {
            this.currentCharacterIndex = characters[currentIndex - 1].init;
        }

        this.displayCharacters();
        this.sendInit();
    }


    // Модифицированная функция для отображения строк персонажей с подсветкой текущего
    displayCharacters() {
        const container = document.getElementById('characters-container');
        container.innerHTML = '';

        let { encounterDifficulty } = calculateEncounterData(this.charactersData);
        document.getElementById('battle-rating').textContent = encounterDifficulty;
        this.rating = encounterDifficulty;
        const characters = this.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

        characters.forEach((character, index) => {
            const row = document.createElement('div');
            row.classList.add('character-row');
            if (character.init === this.currentCharacterIndex) row.classList.add('current-turn');
            row.classList.add(character.npc === 'true' ? 'character-npc' : 'character-player');

            const nameSpan = createEditableSpan(`Имя: ${character.name}`, "name", index, this.updateCharacterProperty.bind(this));
            const initSpan = createEditableSpan(`Init: ${character.init}`, "init", index, this.updateCharacterProperty.bind(this));
            const cdSpan = createEditableSpan(`КД: ${character.cd}`, "cd", index, this.updateCharacterProperty.bind(this));
            const hpSpan = createEditableSpan(`HP: ${character.hp_now}`, "hp_now", index, this.updateCharacterProperty.bind(this),`/ ${character.hp_max}`);
            const expSpanTitle = character.npc === 'true' ? 'DNG' : 'LVL';
            const expSpan = createEditableSpan(`${expSpanTitle}: ${character.exp}`, "exp", index, this.updateCharacterProperty.bind(this));

            const surpriseLabel = this.createCheckbox("Sur", character.surprise, index, 'surprise');
            const npcLabel = this.createCheckbox("НПС", character.npc, index, 'npc');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '-';
            deleteButton.onclick = () => this.deleteCharacter(index);

            const healButton = document.createElement('button');
            healButton.textContent = '+';
            healButton.onclick = () => this.healCharacter(index);

            row.append(nameSpan, initSpan, cdSpan, hpSpan, surpriseLabel, npcLabel, expSpan, deleteButton, healButton);
            container.appendChild(row);
        });

        displayCurrentAndNextTurn(this);
    }

    createCheckbox(labelText, isChecked, index, property) {
        const label = document.createElement('label');
        label.innerHTML = `${labelText}: <input type="checkbox" ${isChecked === "true" ? "checked" : ""} />`;
        label.querySelector("input").onchange = (e) => {
            this.updateCharacterProperty(index, property, e.target.checked ? 'true' : 'false');
        };
        return label;
    }

    // Функция сброса инициативы
    resetInitiative() {
        this.charactersData.forEach((character) => (character.init = ''));
        this.currentRound = 0;

        this.displayCharacters();
        this.sendInit();
    }

    // Функция восстановления здоровья
    healCharacter(index) {
        this.charactersData[index].hp_now = this.charactersData[index].hp_max;
        this.displayCharacters();
        this.sendInit();
    }

    // Функция удаления персонажа
    deleteCharacter(index) {
        this.charactersData.splice(index, 1);
        this.displayCharacters();
        this.sendInit();
    }

    // Добавление обработчиков событий
    addEventListeners() {
        if (typeof document !== "undefined") {
        document.querySelector(".toggle-form-button.reset").addEventListener("click", this.resetInitiative.bind(this));
        document.querySelector(".toggle-form-button.next").addEventListener("click", this.nextTurn.bind(this));
        document.querySelector(".toggle-form-button.prev").addEventListener("click", this.prevTurn.bind(this));
        }
    }
}

// Инициализация и запуск
const initiativeManager = new InitiativeManager();
window.initiativeManager = initiativeManager;
initiativeManager.loadInitiativeData();
export { InitiativeManager };