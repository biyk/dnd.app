import {calculateEncounterData} from './init/func.js';
import {displayInfoBlocks,displayCurrentAndNextTurn} from './init/display.js';


class InitiativeManager {
    constructor() {
        this.initData = {
            currentCharacterIndex: 0,
            currentRound: 0,
            charactersData: [],
            rating: 0, // Рейтинг опасности
            nextCharacterIndex: 0
        };

        // Привязка обработчиков событий
        this.addEventListeners();
    }

    // Функция для загрузки данных из JSON-файла
    loadInitiativeData() {
        fetch("/api/config/init")
            .then(response => {
                if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
                return response.json();
            })
            .then(data => {
                this.initData.currentRound = data.round || 0;
                this.initData.currentCharacterIndex = data.try || 0;
                this.initData.charactersData = data.all || [];
                displayInfoBlocks(this.initData);
                this.displayCharacters();
            })
            .catch(error => console.error("Ошибка при загрузке данных:", error));
    }

    // Функция для отправки данных на сервер
    sendInit() {
        const dataToSend = {
            round: this.initData.currentRound,
            try: this.initData.currentCharacterIndex,
            all: this.initData.charactersData,
            rating: this.initData.rating,
            next: this.initData.nextCharacterIndex
        };

        fetch("/api/config/init", {
            method: "POST",
            headers: { "Content-Type": "application/json;charset=UTF-8" },
            body: JSON.stringify(dataToSend)
        }).catch(error => console.error("Ошибка при отправке данных:", error));
    }

    // Универсальная функция для обновления свойств персонажа
    updateCharacterProperty(index, property, value) {
        this.initData.charactersData[index][property] = value;
        this.displayCharacters();
        this.sendInit();
    }

    // Переход к следующему персонажу
    nextTurn() {
        let characters = this.initData.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));
        let _characters = characters;

        if (this.initData.currentRound === 0) {
            characters = characters.filter(character => character.surprise === "true");
        }

        let next = characters.filter(character => parseFloat(character.init) < this.initData.currentCharacterIndex)[0] || _characters[0];

        this.initData.currentCharacterIndex = next.init;
        if (next.init == characters[0].init) {
            this.initData.currentRound++;
        }

        this.displayCharacters();
        this.sendInit();
    }

    // Переход к предыдущему персонажу
    prevTurn() {
        let characters = this.initData.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

        if (this.initData.currentRound === 0) {
            characters = characters.filter(character => character.surprise === "true");
        }

        let currentIndex = characters.findIndex(character => parseFloat(character.init) === parseFloat(this.initData.currentCharacterIndex));

        if (currentIndex === 0) {
            this.initData.currentCharacterIndex = characters[characters.length - 1].init;
            this.initData.currentRound = Math.max(0, this.initData.currentRound - 1);
        } else {
            this.initData.currentCharacterIndex = characters[currentIndex - 1].init;
        }

        this.displayCharacters();
        this.sendInit();
    }




    // Модифицированная функция для отображения строк персонажей с подсветкой текущего
    displayCharacters() {
        const container = document.getElementById('characters-container');
        container.innerHTML = '';

        let { encounterDifficulty } = calculateEncounterData(this.initData.charactersData);
        document.getElementById('battle-rating').textContent = encounterDifficulty;
        this.initData.rating = encounterDifficulty;
        const characters = this.initData.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

        characters.forEach((character, index) => {
            const row = document.createElement('div');
            row.classList.add('character-row');

            if (character.init === this.initData.currentCharacterIndex) {
                row.classList.add('current-turn');
            }

            row.classList.add(character.npc === 'true' ? 'character-npc' : 'character-player');

            const initSpan = document.createElement('span');
            initSpan.textContent = `Init: ${character.init}`;
            initSpan.onclick = () => {
                const newValue = window.prompt("Введите новое значение инициативы:", character.init);
                if (newValue !== null && !isNaN(newValue)) {
                    this.updateCharacterProperty(index, "init", parseFloat(newValue));
                }
            };

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `Имя: ${character.name}`;
            nameSpan.style.width = '15%';
            nameSpan.onclick = () => {
                const newValue = window.prompt("Введите новое имя:", character.name);
                if (newValue !== null) {
                    this.updateCharacterProperty(index, "name", newValue);
                }
            };

            const cdSpan = document.createElement('span');
            cdSpan.textContent = `КД: ${character.cd}`;
            cdSpan.onclick = () => {
                const newValue = window.prompt("Введите новое значение КД:", character.cd);
                if (newValue !== null && !isNaN(newValue)) {
                    this.updateCharacterProperty(index, "cd", newValue);
                }
            };

            const hpSpan = document.createElement('span');
            hpSpan.innerHTML = `HP: <span class="hp-now">${character.hp_now}</span> / ${character.hp_max}`;
            hpSpan.onclick = () => {
                const newValue = window.prompt("Введите новое значение текущего HP:", character.hp_now);
                if (newValue !== null && !isNaN(newValue)) {
                    this.updateCharacterProperty(index, "hp_now", newValue);
                }
            };

            const surpriseLabel = document.createElement('label');
            surpriseLabel.innerHTML = `Sur: <input type="checkbox" ${character.surprise === "true" ? "checked" : ""} onchange="this.updateCharacterProperty(${index}, 'surprise', this.checked ? 'true' : 'false')" />`;

            const npcLabel = document.createElement('label');
            npcLabel.innerHTML = `НПС: <input type="checkbox" ${character.npc === "true" ? "checked" : ""} onchange="this.updateCharacterProperty(${index}, 'npc', this.checked ? 'true' : 'false')" />`;

            const expSpan = document.createElement('span');
            let expSpanTitle = character.npc ? 'EXP' : 'LVL';
            expSpan.innerHTML = `${expSpanTitle}: ${character.exp}`;
            expSpan.onclick = () => {
                const newValue = window.prompt("Введите новое значение опыта:", character.exp);
                if (newValue !== null && !isNaN(newValue)) {
                    this.updateCharacterProperty(index, "exp", newValue);
                }
            };

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '-';
            deleteButton.onclick = () => this.deleteCharacter(index);

            const healButton = document.createElement('button');
            healButton.textContent = '+';
            healButton.onclick = () => this.healCharacter(index);

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

        displayCurrentAndNextTurn(this.initData);
    }

    // Функция сброса инициативы
    resetInitiative() {
        this.initData.charactersData.forEach((character, index) => {
            this.initData.charactersData[index].init = '';
        });

        this.initData.currentRound = 0;

        this.displayCharacters();
        this.sendInit();
    }

    // Функция восстановления здоровья
    healCharacter(index) {
        const character = this.initData.charactersData[index];
        character.hp_now = character.hp_max;
        this.displayCharacters();
        this.sendInit();
    }

    // Функция удаления персонажа
    deleteCharacter(index) {
        this.initData.charactersData.splice(index, 1);
        this.displayCharacters();
        this.sendInit();
    }



    // Добавление обработчиков событий
    addEventListeners() {
        if (typeof document!="undefined")
        {
        document.querySelector(".toggle-form-button.reset").addEventListener("click", this.resetInitiative.bind(this));
        document.querySelector(".toggle-form-button.next").addEventListener("click", this.nextTurn.bind(this));
        document.querySelector(".toggle-form-button.prev").addEventListener("click", this.prevTurn.bind(this));
        }

    }
}

// Инициализация и запуск
const initiativeManager = new InitiativeManager();
initiativeManager.loadInitiativeData();
