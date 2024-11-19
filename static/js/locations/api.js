export async function loadMainLocations() {
        try {
            const response = await fetch(`${this.apiUrl}?type=main`);
            const data = await response.json();
            if (data && Array.isArray(data)) {
                this.mainLocationSelect.innerHTML = '<option value="">Выберите основную локацию</option>';
                data.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.ID;
                    option.selected = location.active===1
                    option.textContent = location.name;
                    this.mainLocationSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки основных локаций:', error);
        }
    }


export async function loadSubLocations() {
        const mainLocationId = this.mainLocationSelect.value;
        if (!mainLocationId) {
            this.subLocationList.innerHTML = '<li>Пожалуйста, выберите основную локацию.</li>';
            return;
        }
        try {
            const response = await fetch(`${this.apiUrl}?parent_id=${mainLocationId}&active=true`);
            const data = await response.json();
            this.subLocationList.innerHTML = ''; // очищаем список
            if (data && Array.isArray(data) && data.length > 0) {
                data.forEach(location => {
                    const listItem = document.createElement('li');
                    listItem.textContent = location.name;
                    listItem.dataset.locationId = location.ID; // Сохраняем ID в атрибуте
                    listItem.addEventListener('click', () => this.showEditPopup(location));
                    this.subLocationList.appendChild(listItem);
                });
            } else {
                this.subLocationList.innerHTML = '<li>Нет активных подлокаций для выбранной основной локации.</li>';
            }
        } catch (error) {
            console.error('Ошибка загрузки подлокаций:', error);
        }
    }