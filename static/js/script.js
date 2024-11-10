let mapName = "";  // Глобальная переменная для хранения имени карты

// Переменная для главного полигона
let mainPolygon = null;

  // Функция для получения начальной конфигурации
  async function getInit() {
    const response = await fetch('/api/config');
    if (response.ok) {
      return response.json();
    } else {
      console.error("Error fetching initial config");
      return null;
    }
  }

  // Функция для получения детальной конфигурации карты
  async function getConfig(mapName) {
    const response = await fetch(`/api/configs/${mapName}`);
    if (response.ok) {
      return response.json();
    } else {
      console.error(`Error fetching map config for ${mapName}`);
      return null;
    }
  }

  // Инициализация карты после загрузки конфигураций
  async function initMap() {
    const init = await getInit();
    if (!init) return;

    mapName = init.map;  // Сохраняем имя карты для последующего использования
    const config = await getConfig(mapName);
    if (!config) return;

    const image = `/images/${config.image}`;
    const width = config.width;
    const height = config.height;
    const maxLevel = config.maxLevel;
    const minLevel = config.minLevel;
    const orgLevel = config.orgLevel;

    // Расчет параметров карты для корректного отображения
    const tileWidth = 256 * Math.pow(2, orgLevel);
    const radius = tileWidth / 2 / Math.PI;
    const rx = width - tileWidth / 2;
    const ry = -height + tileWidth / 2;
    const west = -180;
    const east = (180 / Math.PI) * (rx / radius);
    const north = 85.05;
    const south = (360 / Math.PI) * (Math.atan(Math.exp(ry / radius)) - (Math.PI / 4));
    const rc = (tileWidth / 2 + ry) / 2;
    const centerLat = (360 / Math.PI) * (Math.atan(Math.exp(rc / radius)) - (Math.PI / 4));
    const centerLon = (west + east) / 2;
    const bounds = [[south, west], [north, east]];

    // Инициализация карты с заданными параметрами
    const map = L.map('map', { maxBounds: bounds });
    L.tileLayer(image + '/{z}-{x}-{y}.jpg', {
      maxZoom: maxLevel,
      minZoom: minLevel,
      noWrap: true,
      bounds: bounds,
      attribution: '<a href="https://github.com/oliverheilig/LeafletPano">LeafletPano</a>'
    }).addTo(map);

    // Установка начального состояния карты (центр и зум)
    map.setView([config.mapState.center.lat, config.mapState.center.lng], config.mapState.zoom);

    // Переменные для рисования полигона
    let polygonPoints = [];
    let polygonMarkers = [];
    let polygons = [];  // Массив для хранения всех полигонов (как из конфигурации, так и новых)
    let markerCount = 0;
    let drawingMode = false;

    // Рисуем полигоны из конфигурации
    config.polygons.forEach(polygonData => {
      const polygonLayer = L.polygon(polygonData.points, {
        color: 'black',
        fillColor: 'black',
        fillOpacity: polygonData.isVisible ? 1.0 : 0.0,
        opacity: polygonData.isVisible ? 1.0 : 0.0,
        weight: 3
      }).addTo(map);

      polygonLayer.isVisible = polygonData.isVisible;
    polygonLayer.on('click', function (e) {
      if (e.originalEvent.ctrlKey) {  // Проверяем, зажат ли Ctrl
        map.removeLayer(this);  // Удаляем полигон с карты
        polygons = polygons.filter(p => p.layer !== this);  // Удаляем из массива
        sendPolygonsData();  // Отправляем обновленные данные на сервер
      } else {
        // Переключение видимости полигона
        this.isVisible = !this.isVisible;
        this.setStyle({
          fillOpacity: this.isVisible ? 1.0 : 0.0,
          opacity: this.isVisible ? 1.0 : 0.0
        });
        sendPolygonsData(); // Отправляем данные после изменения видимости
      }
      });

      // Добавляем полигон в массив
      polygons.push({
        layer: polygonLayer,
        points: polygonData.points,
        isVisible: polygonLayer.isVisible
      });
    });

    // Кнопка для включения/выключения режима рисования
    const drawButton = document.getElementById('draw-button');
    drawButton.addEventListener('click', () => {
      drawingMode = !drawingMode;
      drawButton.textContent = drawingMode ? "Drawing" : "Draw Polygon";  // Изменяем текст кнопки

      if (!drawingMode && polygonPoints.length > 2) {
        // Завершение рисования и добавление полигона
        const polygonLayer = L.polygon(polygonPoints, {
          color: 'black',
          fillColor: 'black',
          fillOpacity: 1.0,
          weight: 3
        }).addTo(map);

        // Добавляем обработчик клика для переключения видимости полигона
        polygonLayer.isVisible = true;
      polygonLayer.on('click', function (e) {
        if (e.originalEvent.ctrlKey) {  // Удаление полигона при зажатом Ctrl
          map.removeLayer(this);
          polygons = polygons.filter(p => p.layer !== this);
          sendPolygonsData();
        } else {
          this.isVisible = !this.isVisible;
          this.setStyle({
            fillOpacity: this.isVisible ? 1.0 : 0.0,
            opacity: this.isVisible ? 1.0 : 0.0
          });
          // Отправляем данные на бэк при изменении видимости
          sendPolygonsData();
        }
        });

        // Удаление маркеров после завершения рисования
        polygonMarkers.forEach(marker => map.removeLayer(marker));
        polygonMarkers = [];

        // Сохранение полигона и его видимости
        polygons.push({
          layer: polygonLayer,
          points: polygonPoints,
          isVisible: polygonLayer.isVisible
        });

        polygonPoints = [];
        markerCount = 0;

        // Отправляем данные на бэк после завершения рисования
        sendPolygonsData();
      }
    });

    // Функция для отправки данных о полигонах на бэк
    function sendPolygonsData() {
      const polygonsData = polygons.map(polygon => ({
        points: polygon.points,
        isVisible: polygon.layer.isVisible
      }));

      // Получаем текущий центр карты и уровень зума
      const center = map.getCenter();
      const zoomLevel = map.getZoom();

      fetch('/api/polygons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mapName: mapName,  // Отправляем mapName
          polygons: polygonsData,
          mapState: {
            center: { lat: center.lat, lng: center.lng },
            zoom: zoomLevel
          }
        })
      })
      .then(response => response.json())
      .then(data => console.log("Data sent successfully:", data))
      .catch(error => console.error("Error sending polygons data:", error));
    }

    // Обработчик для отправки данных при изменении зума
    map.on('zoomend', sendPolygonsData);

    // Обработчик для отправки данных при изменении центра карты
    map.on('moveend', sendPolygonsData);

    // Создание кастомного маркера с номером
    function createNumberedIcon(number) {
      return L.divIcon({
        className: 'numbered-icon',
        iconSize: [10, 10],
        html: `<div style="display: flex; align-items: center;">
                 <div style="width: 6px; height: 6px; background-color: black; border-radius: 50%;"></div>
                 <span style="margin-left: 5px; font-size: 10px;">${number}</span>
               </div>`
      });
    }

    // Обработчик кликов на карту для добавления точек полигона
    map.on('click', (e) => {
      if (drawingMode) {
        markerCount += 1;
        polygonPoints.push([e.latlng.lat, e.latlng.lng]);

        // Добавление маркера с номером и сохранение для последующего удаления
        const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: createNumberedIcon(markerCount) }).addTo(map);
        polygonMarkers.push(marker);
      }
    });

  // Обработчик клика на кнопку reverse-button
  const reverseButton = document.getElementById('reverse-button');
  reverseButton.addEventListener('click', () => {
    if (mainPolygon) {
      // Если главный полигон уже существует, скрываем его
      if (map.hasLayer(mainPolygon)) {
        map.removeLayer(mainPolygon);
      } else {
        // Если полигон скрыт, показываем его
        mainPolygon.addTo(map);
      }
    } else {
      // Если главный полигон еще не был создан, создаем его
    const bounds = map.getBounds();
    const polygonPoints = [
      [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      [bounds.getSouthWest().lat, bounds.getNorthEast().lng],
      [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      [bounds.getNorthEast().lat, bounds.getSouthWest().lng]
    ];

    let holes = [];
    config.polygons.forEach(polygonData => {
      holes.push(polygonData.points);
    })

    // Создаем главный полигон, который будет занимать всю ширину карты
    mainPolygon = L.polygon([polygonPoints,holes], {
      color: 'black',
      fillColor: 'black',
      fillOpacity: 1,
      weight: 3
    }).addTo(map);
    }
  });
  }

  // Запуск инициализации карты
  initMap();
