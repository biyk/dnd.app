import { debounce } from './init/func.js';
import { loadMainLocations, loadSubLocations } from './locations/api.js';

export class LocationManager {
    constructor() {
        const el = id => document.getElementById(id);
        this.apiUrl = '/api/data/location';
        this.mainLocationSelect = el('main-location');
        this.subLocationList = el('sub-locations');
        this.addLocationBtn = el('add-location-btn');
        this.addLocationForm = el('add-location-form');
        this.locationNameInput = el('location-name');
        this.saveLocationBtn = el('save-location');
        this.cancelLocationBtn = el('cancel-location');
        this.editPopup = el('edit-popup');
        this.closePopup = el('close-popup');
        this.editNameInput = el('edit-name');
        this.editNpcList = el('npc-list2');
        this.searchNpcInput = el('loc-npc-input');
        this.searchNpcResults = el('npc-search-results');
        this.currentEditingLocationId = null;
        this.init();
    }

    async init() {
        await this.loadMainLocations();
        this.mainLocationSelect.addEventListener('change', () => this.loadSubLocations());
        this.addLocationBtn.addEventListener('click', () => this.toggleForm(true));
        this.saveLocationBtn.addEventListener('click', () => this.addNewLocation());
        this.cancelLocationBtn.addEventListener('click', () => this.toggleForm(false));
        this.searchNpcInput.addEventListener('input', debounce(() => this.searchNpc(), 300));
        this.closePopup.addEventListener('click', () => this.hideEditPopup());
        this.mainLocationSelect.dispatchEvent(new Event('change'));
    }

    async loadMainLocations() {
        await loadMainLocations.call(this);
    }

    hideEditPopup() {
        this.editPopup.style.display = 'none';
        this.currentEditingLocationId = null;
    }

    async loadSubLocations() {
        await loadSubLocations.call(this);
    }

    async removeLocation(location) {
        try {
            const response = await fetch('/api/data/location/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location })
            });
            response.ok ? await this.loadSubLocations() : console.error('Ошибка при удалении локации');
        } catch (error) {
            console.error('Ошибка при удалении локации:', error);
        }
    }

    toggleForm(show) {
        this.addLocationForm.style.display = show ? 'block' : 'none';
    }

    async addNewLocation() {
        const name = this.locationNameInput.value.trim();
        if (!name) return console.error('Введите название локации');
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, parent_id: this.mainLocationSelect.value })
            });
            if (response.ok) {
                this.toggleForm(false);
                this.locationNameInput.value = '';
                await this.loadSubLocations();
            } else {
                console.error('Ошибка при добавлении локации');
            }
        } catch (error) {
            console.error('Ошибка при добавлении локации:', error);
        }
    }

    async showEditPopup(location) {
        this.currentEditingLocationId = location.ID;
        this.editPopup.style.display = 'block';
        this.editNameInput.value = location.name;
        await this.loadNpcs(location.ID);
    }

    async loadNpcs(locationId) {
        try {
            const response = await fetch(`/api/data/locations/npc?location_id=${locationId}`);
            const data = await response.json();
            this.editNpcList.innerHTML = data?.length
                ? data.map(npc => `
                    <li>
                        <span>${npc.name}</span>
                        <span class="location-del-npc" onclick="window.LocationManager.updateNpcInLocation(${npc.id}, 'remove')">X</span>
                    </li>`).join('')
                : '';
        } catch (error) {
            console.error('Ошибка загрузки персонажей:', error);
        }
    }

    async searchNpc() {
        const query = this.searchNpcInput.value.trim();
        if (!query) return (this.searchNpcResults.innerHTML = '');
        try {
            const response = await fetch(`/api/data/monsters/json?name=${encodeURIComponent(query)}`);
            const data = await response.json();
            this.searchNpcResults.innerHTML = data?.length
                ? data.map(npc => `<li data-monster-id="${npc.id}" onclick="window.LocationManager.updateNpcInLocation(${npc.id}, 'add')">${npc.name}</li>`).join('')
                : '';
        } catch (error) {
            console.error('Ошибка поиска персонажей:', error);
        }
    }

    async updateNpcInLocation(monsterId, action) {
        if (!this.currentEditingLocationId) return;
        const url = `/api/data/locations/npc/${action}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location_id: this.currentEditingLocationId, monster_id: monsterId })
            });
            if (response.ok) {
                await this.loadNpcs(this.currentEditingLocationId);
                console.info(`Персонаж ${action === 'add' ? 'добавлен' : 'удален'} успешно`);
            } else {
                console.error(`Ошибка при ${action === 'add' ? 'добавлении' : 'удалении'} персонажа`);
            }
        } catch (error) {
            console.error(`Ошибка при ${action === 'add' ? 'добавлении' : 'удалении'} персонажа:`, error);
        }
    }
}

window.LocationManager = new LocationManager();
