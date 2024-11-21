import { debounce } from './init/func.js';

export class NpcManager {
    constructor() {
        const el = id => document.getElementById(id);
        this.apiUrl = '/api/data/location';
        // Ссылки на элементы
        this.searchNpcInput = el('npc-template-search');
        this.searchNpcResults = el('template-npc-search-results');
        this.npcCd = el('npc-kd');
        this.npcName = el('npc-name');
        this.npcHp = el('npc-health');
        this.npcTemplate = el('npc-template');
        this.monsters = new Map();
        this.init();
    }

    init() {
        this.searchNpcInput.addEventListener('input', debounce(() => this.searchNpc(), 300));
        document.getElementById('npc-form').addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    async handleFormSubmit(event) {
        event.preventDefault(); // Предотвращаем стандартную отправку формы
        try {
            const response = await fetch('/api/data/npc/add', {
                method: 'POST',
                body: new FormData(event.target)
            });
            if (!response.ok) throw new Error('Ошибка при отправке формы');
            const { message } = await response.json();
            console.info(message);
        } catch (error) {
            alert('Произошла ошибка: ' + error.message);
        }
    }

    async searchNpc() {
        const query = this.searchNpcInput.value.trim();
        if (!query) {
            this.searchNpcResults.innerHTML = '';
            return;
        }
        try {
            const response = await fetch(`/api/data/monsters/json?name=${encodeURIComponent(query)}`);
            const data = await response.json();
            this.monsters = new Map(data.map(npc => [npc.id, npc]));
            this.searchNpcResults.innerHTML = data.length
                ? data.map(npc => `<li data-monster-id="${npc.id}" onclick="window.NpcManager.useTemplate(${npc.id})">${npc.name}</li>`).join('')
                : '';
        } catch (error) {
            console.error('Ошибка поиска персонажей:', error);
        }
    }

    useTemplate(monsterId) {
        const npc = this.monsters.get(monsterId);
        if (npc) {
            this.npcCd.value = npc.armor_class || '';
            this.npcName.value = npc.name || '';
            this.npcHp.value = npc.hit_points || '';
            this.npcTemplate.value = npc.id || '';
        } else {
            console.error(`Шаблон NPC с ID ${monsterId} не найден`);
        }
    }
}

window.NpcManager = new NpcManager();
