let mapName = "";  // Глобальная переменная для хранения имени карты
let mainPolygon = null;  // Переменная для главного полигона
let map = null;  // Карта
let polygons = [];  // Массив для хранения всех полигонов
let polygonPoints = [];  // Точки текущего полигона
let polygonMarkers = [];  // Маркеры для точек полигона
let markerCount = 0;  // Счётчик маркеров
let drawingMode = false;  // Режим рисования

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

// Функция для получения конфигурации карты по имени
async function getConfig(mapName) {
  const response = await fetch(`/api/configs/${mapName}`);
  if (response.ok) {
    return response.json();
  } else {
    console.error(`Error fetching map config for ${mapName}`);
    return null;
  }
}

// Функция для инициализации карты
async function initMap() {
  const init = await getInit();
  if (!init) return;

  mapName = init.map;  // Сохраняем имя карты для последующего использования
  const config = await getConfig(mapName);
  if (!config) return;

  initializeMap(config);  // Инициализация карты
  createPolygons(config);  // Создание полигонов из конфигурации
  setDrawButtonHandler();  // Настройка обработчика для кнопки рисования
  setReverseButtonHandler(config);  // Настройка обработчика для кнопки reverse
  setMapEventHandlers();  // Обработчики событий для карты
}

// Функция для инициализации карты
function initializeMap(config) {
  const image = `/images/${config.image}`;
  const width = config.width;
  const height = config.height;
  const maxLevel = config.maxLevel;
  const minLevel = config.minLevel;
  const orgLevel = config.orgLevel;

  const tileWidth = 256 * Math.pow(2, orgLevel);
  const radius = tileWidth / 2 / Math.PI;
  const rx = width - tileWidth / 2;
  const ry = -height + tileWidth / 2;
  const west = -180;
  const east = (180 / Math.PI) * (rx / radius);
  const north = 85.05;
  const south = (360 / Math.PI) * (Math.atan(Math.exp(ry / radius)) - (Math.PI / 4));
  const bounds = [[south, west], [north, east]];

  // Инициализация карты
  map = L.map('map', { maxBounds: bounds });
  L.tileLayer(image + '/{z}-{x}-{y}.jpg', {
    maxZoom: maxLevel,
    minZoom: minLevel,
    noWrap: true,
    bounds: bounds,
    attribution: '<a href="https://github.com/oliverheilig/LeafletPano">LeafletPano</a>'
  }).addTo(map);

  map.setView([config.mapState.center.lat, config.mapState.center.lng], config.mapState.zoom);
}

// Функция для создания полигонов из конфигурации
function createPolygons(config) {
  config.polygons.forEach(polygonData => {
    const polygonLayer = L.polygon(polygonData.points, {
      color: 'black',
      fillColor: 'black',
      fillOpacity: polygonData.isVisible ? 1.0 : 0.0,
      opacity: polygonData.isVisible ? 1.0 : 0.0,
      weight: 1
    }).addTo(map);

    polygonLayer.isVisible = polygonData.isVisible;
    polygonLayer.clickHandler = createPolygonClickHandler(polygonLayer);
    polygonLayer.on('click', polygonLayer.clickHandler);

    polygons.push({
      layer: polygonLayer,
      points: polygonData.points,
      isVisible: polygonLayer.isVisible
    });
  });

  // Если в конфигурации есть данные о mainPolygon, создаем его
  if (config.mainPolygon) {
    mainPolygon = L.polygon(config.mainPolygon.points, {
      color: 'black',
      fillColor: 'black',
      fillOpacity: 1.0,
      weight: 3
    }).addTo(map);
  }
}

// Функция для создания обработчика клика для полигона
function createPolygonClickHandler(polygonLayer) {
  return function (e) {
    if (e.originalEvent.ctrlKey) {
      map.removeLayer(this);
      polygons = polygons.filter(p => p.layer !== this);
      sendPolygonsData();
    } else {
      this.isVisible = !this.isVisible;
      this.setStyle({
        fillOpacity: this.isVisible ? 1.0 : 0.0,
        opacity: this.isVisible ? 1.0 : 0.0
      });
      sendPolygonsData();
    }
  };
}

// Функция для отправки данных о полигонах на сервер
function sendPolygonsData() {
  const polygonsData = polygons.map(polygon => ({
    points: polygon.points,
    isVisible: polygon.layer.isVisible
  }));

  const center = map.getCenter();
  const zoomLevel = map.getZoom();

  fetch('/api/polygons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mapName: mapName,
      polygons: polygonsData,
      mainPolygon: mainPolygon ? {
        points: mainPolygon.getLatLngs()
      } : null,
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

// Функция для настройки кнопки рисования
function setDrawButtonHandler() {
  const drawButton = document.getElementById('draw-button');
  drawButton.addEventListener('click', () => {
    drawingMode = !drawingMode;
    drawButton.textContent = drawingMode ? "Finish Drawing" : "Draw Polygon";

    if (drawingMode) {
      setPolygonsOpacity(0.6);
      setPolygonClickability(false);
    } else {
      setPolygonsOpacity(1.0);
      setPolygonClickability(true);

      if (polygonPoints.length > 2) {
        createNewPolygon();
        sendPolygonsData();
      }
    }
  });
}

// Функция для настройки кнопки reverse
function setReverseButtonHandler(config) {
  const reverseButton = document.getElementById('reverse-button');
  reverseButton.addEventListener('click', () => {
    if (mainPolygon) {
      toggleMainPolygonVisibility();
    } else {
      createMainPolygon(config);
    }
  });
}

// Функция для создания нового полигона
function createNewPolygon() {
  const polygonLayer = L.polygon(polygonPoints, {
    color: 'black',
    fillColor: 'black',
    fillOpacity: 1.0,
    weight: 1
  }).addTo(map);

  polygonLayer.isVisible = true;
  polygonLayer.clickHandler = createPolygonClickHandler(polygonLayer);
  polygonLayer.on('click', polygonLayer.clickHandler);

  polygons.push({
    layer: polygonLayer,
    points: polygonPoints,
    isVisible: polygonLayer.isVisible
  });

  polygonMarkers.forEach(marker => map.removeLayer(marker));
  polygonMarkers = [];
  polygonPoints = [];
  markerCount = 0;
}

// Функция для переключения видимости главного полигона
function toggleMainPolygonVisibility() {
  if (map.hasLayer(mainPolygon)) {
    map.removeLayer(mainPolygon);
  } else {
    mainPolygon.addTo(map);
  }
}

// Функция для создания главного полигона
function createMainPolygon(config) {
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
  });

  mainPolygon = L.polygon([polygonPoints, holes], {
    color: 'black',
    fillColor: 'black',
    fillOpacity: 1,
    weight: 3
  }).addTo(map);
}

// Функция для установки прозрачности всех полигонов
function setPolygonsOpacity(opacity) {
  polygons.forEach(p => p.layer.setStyle({ fillOpacity: opacity }));
}

// Функция для включения/отключения кликов на полигонах
function setPolygonClickability(enabled) {
  polygons.forEach(p => {
    if (enabled) {
      p.layer.on('click', p.clickHandler);
    } else {
      p.layer.off('click', p.clickHandler);
    }
  });
}

// Функция для обработки событий карты
function setMapEventHandlers() {
  map.on('zoomend', sendPolygonsData);
  map.on('moveend', sendPolygonsData);

  map.on('click', (e) => {
    if (drawingMode) {
      markerCount += 1;
      polygonPoints.push([e.latlng.lat, e.latlng.lng]);

      const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: createNumberedIcon(markerCount) }).addTo(map);
      polygonMarkers.push(marker);
    }
  });
}

// Функция для создания кастомного маркера
function createNumberedIcon(number) {
  return L.divIcon({
    className: 'numbered-icon',
    iconSize: [10, 10],
    html: `<div style="display: flex; align-items: center;">
             <div style="min-width: 6px; height: 6px; background-color: red; border-radius: 50%;"></div>
             <span style="color:red; margin-left: 5px; font-size: 10px;">${number}</span>
           </div>`
  });
}

// Запуск инициализации карты
initMap();
