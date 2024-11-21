    const textarea = document.getElementById('dynamic-text');

    // Функция debounce, которая задерживает выполнение функции
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout); // Очищаем предыдущий таймер
            timeout = setTimeout(() => func.apply(this, args), delay); // Устанавливаем новый таймер
        };
    }

    // Функция отправки данных
    function sendData() {
        const data = { text: textarea.value }; // Подготавливаем данные для отправки

        fetch('/api/config/dm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => console.log('Успешный ответ от сервера:', data))
        .catch(error => console.error('Ошибка при отправке:', error));
    }

    // Создаем обертку sendData с дебаунсом на 500 мс
    const debouncedSendData = debounce(sendData, 500);

    // Вызываем debouncedSendData при каждом событии 'input'
    textarea.addEventListener('input', debouncedSendData);

    // Функция для загрузки данных при старте
    function loadData() {
        fetch('/api/config/dm', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            // Если данные получены, заполняем textarea
            textarea.value = data.join('\n');
        })
        .catch(error => console.error('Ошибка при загрузке данных:', error));
    }

    // Загружаем данные при загрузке страницы
    loadData();