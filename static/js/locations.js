import {debounce } from './init/func.js'
import {} from './locations/helpers.js'
import {loadMainLocations, loadSubLocations} from './locations/api.js'

class LocationManager {
    constructor() {
        this.apiUrl = '/api/data/location';
        this.mainLocationSelect = document.getElementById('main-location');
        this.subLocationList = document.getElementById('sub-locations');
        this.addLocationBtn = document.getElementById('add-location-btn');
        this.addLocationForm = document.getElementById('add-location-form');
        this.locationNameInput = document.getElementById('location-name');
        this.saveLocationBtn = document.getElementById('save-location');
        this.cancelLocationBtn = document.getElementById('cancel-location');
        this.editPopup = document.getElementById('edit-popup');
        this.closePopup = document.getElementById('close-popup');
        this.editNameInput = document.getElementById('edit-name');
        this.editNpcList = document.getElementById('npc-list2');
        this.searchNpcInput = document.getElementById('loc-npc-input');
        this.searchNpcResults = document.getElementById('npc-search-results');
        this.currentEditingLocationId = null;
        this.init();
    }
    async init() {
        // Инициализация: загружаем основные локации
        await this.loadMainLocations();

        // Слушаем событие выбора основной локации
        this.mainLocationSelect.addEventListener('change', () => this.loadSubLocations());

        // Обработчик клика по кнопке "Добавить локацию"
        this.addLocationBtn.addEventListener('click', () => this.showAddLocationForm());

        // Обработчик сохранения новой локации
        this.saveLocationBtn.addEventListener('click', () => this.addNewLocation());

        // Обработчик отмены добавления локации
        this.cancelLocationBtn.addEventListener('click', () => this.hideAddLocationForm());

        // Обработчик поиска NPC
        this.searchNpcInput.addEventListener('input', debounce(() => this.searchNpc(), 300));

        // Обработчик закрытия попапа редактирования
        this.closePopup.addEventListener('click', () => this.hideEditPopup());

        this.mainLocationSelect.dispatchEvent(new Event('change'));
    }
    // Загружаем основные локации
    async loadMainLocations() {
        await loadMainLocations.call(this);
    }

    // Скрываем попап редактирования
    hideEditPopup() {
        this.editPopup.style.display = 'none';
        this.currentEditingLocationId = null; // Сбрасываем текущую редактируемую локацию
    }

    // Загружаем подлокации для выбранной основной локации
    async loadSubLocations() {
        await loadSubLocations.call(this);
    }

    removeLocation = async function (location) {
        const response = await fetch('/api/data/location/remove', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({location})
        });
           if (response.ok) {
                alert('Локация успешно удалена');
                this.loadSubLocations(); // Перезагрузить подлокации
            } else {
                alert('Ошибка при удалении локации');
            }
        return undefined;
    };
    // Отображаем форму для добавления новой локации
    showAddLocationForm() {
        this.addLocationForm.style.display = 'block';
    }
    // Скрываем форму для добавления новой локации
    hideAddLocationForm() {
        this.addLocationForm.style.display = 'none';
    }
    // Добавляем новую локацию
    async addNewLocation() {
        const locationName = this.locationNameInput.value.trim();
        if (!locationName) {
            alert('Введите название локации');
            return;
        }
        const newLocation = {
            name: locationName,
            parent_id: this.mainLocationSelect.value // Устанавливаем родительскую локацию
        };
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newLocation)
            });
            if (response.ok) {
                alert('Локация успешно добавлена');
                this.hideAddLocationForm();
                this.locationNameInput.value = ''; // Очистить поле ввода
                this.loadSubLocations(); // Перезагрузить подлокации
            } else {
                alert('Ошибка при добавлении локации');
            }
        } catch (error) {
            console.error('Ошибка при добавлении локации:', error);
            alert('Ошибка при добавлении локации');
        }
    }

    // Показываем попап редактирования
    async showEditPopup(location) {
        this.currentEditingLocationId = location.ID;
        this.editPopup.style.display = 'block';
        this.editNameInput.value = location.name;

        // Загружаем NPC для данной локации
        await this.loadNpcs(location.ID);
    }

    // Загружаем NPC для выбранной локации
    async loadNpcs(locationId) {
        try {
            const response = await fetch(`/api/data/locations/npc?location_id=${locationId}`);
            const data = await response.json();
            this.editNpcList.innerHTML = '';
            if (data && Array.isArray(data)) {
                data.forEach(npc => {
                    const listItem = document.createElement('li');
                    const npcName = document.createElement('span');
                    const delNpc = document.createElement('span');
                    npcName.textContent = npc.name;
                    delNpc.textContent = 'X';
                    delNpc.addEventListener('click', () => this.delNpcFromLocation(npc.id));
                    listItem.append(npcName, delNpc)
                    this.editNpcList.appendChild(listItem);
                });
            } else {
                this.editNpcList.innerHTML = '<li>Нет персонажей.</li>';
            }
        } catch (error) {
            console.error('Ошибка загрузки персонажей:', error);
        }
    }

    // Поиск NPC
    async searchNpc() {
        const query = this.searchNpcInput.value.trim();
        if (!query) {
            this.searchNpcResults.innerHTML = '';
            return;
}
        try {
            const response = await fetch(`/api/data/monsters?name=${encodeURIComponent(query)}`);
            const data = await response.json();
            this.searchNpcResults.innerHTML = '';
            if (data && Array.isArray(data)) {
                data.forEach(npc => {
                    const listItem = document.createElement('li');
                    listItem.textContent = npc.name;
                    listItem.dataset.monsterId = npc.id; // Сохраняем ID персонажа
                    listItem.addEventListener('click', () => this.addNpcToLocation(npc.id));
                    this.searchNpcResults.appendChild(listItem);
                });
            }
        } catch (error) {
            console.error('Ошибка поиска персонажей:', error);
        }
    }

    // Добавление NPC в локацию
    async addNpcToLocation(monsterId) {
        if (!this.currentEditingLocationId) return;
        try {
            const response = await fetch('/api/data/locations/npc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location_id: this.currentEditingLocationId,
                    monster_id: monsterId
                })
            });
            if (response.ok) {
                alert('Персонаж успешно добавлен');
                await this.loadNpcs(this.currentEditingLocationId); // Обновляем список персонажей
            } else {
                alert('Ошибка при добавлении персонажа');
            }
        } catch (error) {
            console.error('Ошибка добавления персонажа:', error);
        }
    }

    async delNpcFromLocation(monsterId) {
        if (!this.currentEditingLocationId) return;
        try {
            const response = await fetch('/api/data/locations/npc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location_id: this.currentEditingLocationId,
                    monster_id: monsterId
                })
            });
            if (response.ok) {
                alert('Персонаж успешно удален');
                await this.loadNpcs(this.currentEditingLocationId); // Обновляем список персонажей
            } else {
                alert('Ошибка при удалении персонажа');
            }
        } catch (error) {
            console.error('Ошибка удаления персонажа:', error);
        }
    }
}

new LocationManager();