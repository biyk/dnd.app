// Функция для загрузки радиобаттонов и отправки данных на сервер
async function loadAmbienceRadios() {
    try {
        const response = await fetch('/static/audio/ambience.json');
        const data = await response.json();
        const container = document.getElementById('ambience-tab');
        Object.entries(data).forEach(([key, value]) => {
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'ambience';
            radio.value = key;
            radio.id = `radio-${key}`;
            const label = document.createElement('label');
            label.htmlFor = `radio-${key}`;
            label.textContent = value;
            // Добавляем радио-кнопку и метку в контейнер
            container.appendChild(radio);
            container.appendChild(label);
            // Добавляем обработчик для отправки значения на сервер при выборе радио-кнопки
            radio.addEventListener('change', async () => {
                try {
                    await fetch('/api/config/ambience', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ambience: radio.value })
                    });
                    console.log(`Отправлено значение: ${radio.value}`);
                } catch (error) {
                    console.error('Ошибка при отправке:', error);
                }
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}
loadAmbienceRadios();