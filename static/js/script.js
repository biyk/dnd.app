import { getInit, getConfig } from './script/api.js';
import { createNumberedIcon, setAudio, getParticipantHTML } from './script/helpers.js';

class MapManager {
  constructor() {
    this.mapName = ""; // Имя карты
    this.mainPolygon = null; // Главный полигон
    this.map = null; // Карта
    this.polygons = []; // Массив для полигонов
    this.polygonPoints = []; // Точки текущего полигона
    this.polygonMarkers = []; // Маркеры точек полигона
    this.markerCount = 0; // Счётчик маркеров
    this.drawingMode = false; // Режим рисования
    this.lastUpdated = 0; // Последняя временная метка
    this.admin_mode = window.admin_mode || false; // Админ-режим
  }

  async initMap() {
    const init = await getInit();
    if (!init) return;

    this.mapName = init.map;
    const config = await getConfig(this.mapName);
    if (!config) return;

    this.lastUpdated = config.lastUpdated;
    this.initializeMap(config);
    this.createPolygons(config);
    this.setDrawButtonHandler();
    this.setReverseButtonHandler(config);
    this.setMapEventHandlers();

    if (!this.admin_mode) setInterval(() => this.checkForConfigUpdates(), 1000);
  }

  initializeMap(config) {
    const image = `/static/images/${config.image}`;
    const { width, height, maxLevel, minLevel, orgLevel } = config;

    const tileWidth = 256 * Math.pow(2, orgLevel);
    const radius = tileWidth / 2 / Math.PI;
    const rx = width - tileWidth / 2;
    const ry = -height + tileWidth / 2;
    const west = -180;
    const east = (180 / Math.PI) * (rx / radius);
    const north = 85.05;
    const south = (360 / Math.PI) * (Math.atan(Math.exp(ry / radius)) - Math.PI / 4);
    const bounds = [[south, west], [north, east]];

    const mapOptions = {
      maxBounds: bounds,
      zoomControl: this.admin_mode,
      dragging: this.admin_mode,
      scrollWheelZoom: this.admin_mode,
      doubleClickZoom: this.admin_mode,
      touchZoom: this.admin_mode,
      keyboard: this.admin_mode,
    };

    this.map = L.map('map', mapOptions);
    L.tileLayer(image + '/{z}-{x}-{y}.jpg', {
      maxZoom: maxLevel,
      minZoom: minLevel,
      noWrap: true,
      bounds: bounds,
      attribution: '<a href="https://github.com/oliverheilig/LeafletPano">LeafletPano</a>',
    }).addTo(this.map);

    this.map.setView([config.mapState.center.lat, config.mapState.center.lng], config.mapState.zoom);
  }

  createPolygons(config) {
    this.polygons.forEach(polygon => this.map.removeLayer(polygon.layer));
    this.polygons = [];

    config.polygons.forEach(polygonData => {
      const polygonLayer = L.polygon(polygonData.points, {
        color: 'black',
        fillColor: 'black',
        fillOpacity: polygonData.isVisible ? 1.0 : 0.0,
        opacity: polygonData.isVisible ? 1.0 : 0.0,
        weight: 1,
      }).addTo(this.map);

      polygonLayer.isVisible = polygonData.isVisible;
      polygonLayer.clickHandler = this.createPolygonClickHandler(polygonLayer);
      polygonLayer.on('click', polygonLayer.clickHandler);

      this.polygons.push({
        layer: polygonLayer,
        points: polygonData.points,
        isVisible: polygonLayer.isVisible,
      });
    });

    if (config.mainPolygon) {
      if (this.mainPolygon) this.map.removeLayer(this.mainPolygon);
      this.mainPolygon = L.polygon(config.mainPolygon.points, {
        color: 'black',
        fillColor: 'black',
        fillOpacity: 1.0,
        weight: 3,
      }).addTo(this.map);
    }
  }

  createPolygonClickHandler(polygonLayer) {
    if (this.admin_mode) {
      return (e) => {
        if (e.originalEvent.ctrlKey) {
          this.map.removeLayer(polygonLayer);
          this.polygons = this.polygons.filter(p => p.layer !== polygonLayer);
          this.sendPolygonsData();
        } else {
          polygonLayer.isVisible = !polygonLayer.isVisible;
          polygonLayer.setStyle({
            fillOpacity: polygonLayer.isVisible ? 1.0 : 0.0,
            opacity: polygonLayer.isVisible ? 1.0 : 0.0,
          });
          this.sendPolygonsData();
        }
      };
    }
  }

  sendPolygonsData() {
    if (!this.admin_mode) return;

    const polygonsData = this.polygons.map(polygon => ({
      points: polygon.points,
      isVisible: polygon.layer.isVisible,
    }));

    const center = this.map.getCenter();
    const zoomLevel = this.map.getZoom();

    fetch('/api/polygons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mapName: this.mapName,
        polygons: polygonsData,
        mainPolygon: this.mainPolygon ? { points: this.mainPolygon.getLatLngs() } : null,
        mapState: {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoomLevel,
        },
      }),
    })
      .then(response => response.json())
      .then(data => console.log("Data sent successfully:", data))
      .catch(error => console.error("Error sending polygons data:", error));
  }

  setDrawButtonHandler() {
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

  setReverseButtonHandler(config) {
    const reverseButton = document.getElementById('reverse-button');
    if (!reverseButton) return;

    reverseButton.addEventListener('click', () => {
      if (this.mainPolygon) {
        this.updateMainPolygon(config);
        this.toggleMainPolygonVisibility();
      } else {
        this.createMainPolygon(config);
      }
    });
  }

  createNewPolygon() {
    const polygonLayer = L.polygon(this.polygonPoints, {
      color: 'black',
      fillColor: 'black',
      fillOpacity: 1.0,
      weight: 1,
    }).addTo(this.map);

    polygonLayer.isVisible = true;
    polygonLayer.clickHandler = this.createPolygonClickHandler(polygonLayer);
    polygonLayer.on('click', polygonLayer.clickHandler);

    this.polygons.push({
      layer: polygonLayer,
      points: this.polygonPoints,
      isVisible: polygonLayer.isVisible,
    });

    this.polygonMarkers.forEach(marker => this.map.removeLayer(marker));
    this.polygonMarkers = [];
    this.polygonPoints = [];
    this.markerCount = 0;
  }

  toggleMainPolygonVisibility() {
    if (this.map.hasLayer(this.mainPolygon)) {
      this.map.removeLayer(this.mainPolygon);
    } else {
      this.mainPolygon.addTo(this.map);
    }
  }

  createMainPolygon(config) {
    const bounds = this.map.getBounds();
    const polygonPoints = [
      [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      [bounds.getSouthWest().lat, bounds.getNorthEast().lng],
      [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      [bounds.getNorthEast().lat, bounds.getSouthWest().lng],
    ];

    let holes = [];
    config.polygons.forEach(polygonData => {
      holes.push(polygonData.points);
    });

    this.mainPolygon = L.polygon([polygonPoints, holes], {
      color: 'black',
      fillColor: 'black',
      fillOpacity: 1,
      weight: 3,
    }).addTo(this.map);
  }

  updateMainPolygon(config) {
    let holes = [];
    config.polygons.forEach(polygonData => {
      holes.push(polygonData.points);
    });
    this.mainPolygon.setLatLngs([this.mainPolygon.getLatLngs()[0], holes]);
  }

  async checkForConfigUpdates() {
    const config = await getConfig(this.mapName);
    this.updateInfoBar(config);

    if (config && config.lastUpdated !== this.lastUpdated) {
      this.lastUpdated = config.lastUpdated;
      this.createPolygons(config);
      setAudio(config);
      startCountdown(config.timer);
      updateSkullColor(config.init.rating);

      this.map.setView([config.mapState.center.lat, config.mapState.center.lng], config.mapState.zoom);
      console.log("Map data updated due to configuration change.");
    }
  }

    setPolygonsOpacity(opacity) {
    this.polygons.forEach(polygon => polygon.layer.setStyle({ fillOpacity: opacity, opacity: opacity }));
  }

    setPolygonClickability(clickable) {
    this.polygons.forEach(polygon => {
      if (clickable) {
        polygon.layer.on('click', polygon.layer.clickHandler);
      } else {
        polygon.layer.off('click', polygon.layer.clickHandler);
      }
    });
  }

  setMapEventHandlers() {
    this.map.on('zoomend', ()=>{
      this.sendPolygonsData();
    });

    this.map.on('moveend', ()=>{
      this.sendPolygonsData()
    });

    this.map.on('click', (e) => {
      if (this.drawingMode) {
        this.markerCount += 1;
        this.polygonPoints.push([e.latlng.lat, e.latlng.lng]);

        const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: createNumberedIcon(this.markerCount) }).addTo(this.map);
        this.polygonMarkers.push(marker);
      }
    });
  }

  updateInfoBar(data) {
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
}

const mapManager = new MapManager();
mapManager.initMap();
