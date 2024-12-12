// Функция для создания кастомного маркера
export function createNumberedIcon(number) {
    return L.divIcon({className: 'numbered-icon', iconSize: [10, 10], html: `<div style="display: flex; align-items: center;">
                <div style="min-width: 6px; height: 6px; background-color: red; border-radius: 50%;"></div>
                <span style="color:red; margin-left: 5px; font-size: 10px;">${number}</span>
              </div>`
    });
}

export function setAudio(config) {
    const audio = document.getElementById('audio');
    let src = '/static/audio/'+config.ambience+'.mp3';
    if (audio.src.indexOf(src)==-1) {audio.src = src;audio.play();
    }
}

// Функция для расчёта цвета по здоровью
export function getHealthColor(hpNow, hpMax) {
    const ratio = hpNow / hpMax;
    if (ratio > 1 ) {
        // Переход от зеленого к синему
        const blueRatio = (ratio - 1) * 2; // Нормализуем в диапазон [0, 1]
        const g = Math.round(255 * (1 - blueRatio));
        const b = Math.round(255 * blueRatio);
        return `rgb(0, ${g}, ${b})`;
    } else if (ratio >= 0.5) {
        // Переход от желтого к зеленому
        const greenRatio = (ratio - 0.5) * 2; // Нормализуем в диапазон [0, 1]
        const r = Math.round(255 * (1 - greenRatio));
        const g = 255;
        return `rgb(${r}, ${g}, 0)`;
    } else if (ratio > 0) {
        // Переход от красного к желтому
        const redRatio = ratio * 2; // Нормализуем в диапазон [0, 1]
        const r = 255;
        const g = Math.round(255 * redRatio);
        return `rgb(${r}, ${g}, 0)`;
    } else {
        // Если ratio <= 0, полностью красный
        return `rgb(255, 0, 0)`;
    }
}

// Генерация HTML для участника
export function getParticipantHTML(participant) {
    const { name, hp_now, hp_max } = participant;
    const color = getHealthColor(hp_now, hp_max);
    return `<span style="color: ${color};">${name}</span>`;
}

export function setDrawButtonHandler() {
    const drawButton = document.getElementById('draw-button');
    if (!drawButton) return;
    drawButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.drawingMode = !this.drawingMode;
        drawButton.textContent = this.drawingMode ? "Finish Drawing" : "Draw Polygon";
        if (this.drawingMode) {
            this.setPolygonsOpacity(0.6);
            this.setPolygonClickability(false);
        } else {
            this.setPolygonsOpacity(1.0);
            this.setPolygonClickability(true);
            if (this.polygonPoints.length > 2) {
                this.createNewPolygon();
                this.sendPolygonsData();
            }
        }
    });
}

export function updateInfoBar(data) {
    const infoBar = document.getElementById('info-bar');
    if (!infoBar) return;
    const round = data.init.round;
    const tryNumber = data.init.try; // Пример: чтобы отображать дробное значение
    const nextNumber = data.init.next; // Пример: чтобы отображать дробное значение
    const participants = data.init.all;
    // Сортируем участников по инициативе
    const sortedParticipants = participants.slice().sort((a, b) => b.init - a.init);
    // Находим текущий и следующий ход
    const currentIndex = sortedParticipants.findIndex(participant => participant.init.toString() === tryNumber.toString());
    const nextIndex = sortedParticipants.findIndex(participant => participant.init.toString() === nextNumber.toString());
    const current = sortedParticipants[currentIndex] || null;
    const next = sortedParticipants[nextIndex] || null;
    // Обновляем информационную строку
    infoBar.innerHTML = `
         Раунд: <span>${round}</span>,
         Ход: ${current ? getParticipantHTML(current) : '---'},
         Следующий: ${next ? getParticipantHTML(next) : '---'}
       `;
}
export function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
