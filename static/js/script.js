import {getInit, getConfig, sendPolygonsData, checkForConfigUpdates} from './script/api.js';
import {createNumberedIcon, getParticipantHTML, updateInfoBar} from './script/helpers.js';
import {checkTab} from './tabs.js';
import {
    createMainPolygon,
    createPolygons,
    setPolygonClickability,
    toggleMainPolygonVisibility,
    updateMainPolygon
} from './script/poligons.js'
import {SlideMenu} from './script/makrer.js'

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
        this.config = {};
        this.SlideMenu =  {};
        this.selectedIcon = null;
        this.points = new Map();
        this.lastClick = {}
    }

    async initMap() {
        const init = await getInit();
        if (!init) return;

        this.mapName = init.map;
        const config = await getConfig(this.mapName);
        if (!config) return;
        this.config = config;
        this.lastUpdated = config.lastUpdated;
        this.initializeMap(config);
        this.createPolygons(config);
        this.setDrawButtonHandler();
        this.setReverseButtonHandler(config);
        this.setMapEventHandlers();
        this.initializeMarkerMenu();
        updateInfoBar(config);
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
        createPolygons.call(this,config)
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
        sendPolygonsData.call(this);
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
        toggleMainPolygonVisibility.call(this);
    }

    createMainPolygon(config) {
        createMainPolygon.call(this,config)
    }

    updateMainPolygon(config) {
        updateMainPolygon.call(this, config);
    }

    async checkForConfigUpdates() {
        await checkForConfigUpdates.call(this);
    }

    setPolygonsOpacity(opacity) {
        this.polygons.forEach(polygon => polygon.layer.setStyle({ fillOpacity: opacity, opacity: opacity }));
    }

    setPolygonClickability(clickable) {
        setPolygonClickability.call(this,clickable)
    }

    setMapEventHandlers() {
        this.map.on('zoomend', ()=>{
            this.sendPolygonsData();
        });

        this.map.on('movestart', ()=>{
            document.getElementById('map').style.opacity = '0';
        });
        this.map.on('moveend', ()=>{
            this.sendPolygonsData();
            document.getElementById('map').style.opacity = '1';

        });

        this.map.on('click', (e) => {
            this.lastClick = e.latlng;
            if (this.drawingMode) {
                this.markerCount += 1;
                this.polygonPoints.push([e.latlng.lat, e.latlng.lng]);

                const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: createNumberedIcon(this.markerCount) }).addTo(this.map);
                this.polygonMarkers.push(marker);
            }
            if (this.selectedIcon) {
                // Размещаем маркер с выбранной иконкой
                let id = new Date().getTime();
                const marker = L.marker(e.latlng, {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: `<div data-id>${this.selectedIcon.emoji}</div>`,
                    }),
                    draggable: true
                }).addTo(this.map);
                marker.bindPopup(`
                   <button onclick="window.mapManager.removeMarker(${id})">Remove</button>
                 `);

                this.points.set(id, marker);
                // Сбрасываем выбранную иконку
                this.selectedIcon = null;
                document.querySelector('.marker-menu').style.display = 'block'; // Показываем сайдбар
                console.log(
                    Array.from(this.points)
                )
                this.setPolygonClickability(true);
            }
        });

        this.map.whenReady(this.whenReady);

        let markerButton = document.getElementById('marker-button');
        if (markerButton) {
            markerButton.addEventListener('click', (e) => {
                const sidebar = document.querySelector('.marker-menu');
                sidebar.style.right = sidebar.style.right === '0px' ? '-33%' : '0px';
            })
        }

    }

    whenReady(){
        checkTab();
        this.SlideMenu =  new SlideMenu();
        this.SlideMenu.initializeMapMarkers(this.map);
    }

    removeMarker(index) {
        const marker = this.points.get(index);
        if (marker) {
            window.mapManager.map.removeLayer(marker);
            this.points.delete(index);
        }
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

    initializeMarkerMenu() {
        const sidebar = document.createElement('div');
        sidebar.classList.add('marker-menu');
        this.menu = sidebar;
        const icons = [{ name: "Человечек", emoji: "👤" },
            { name: "Дерево", emoji: "🌳" },
            { name: "Черепушка", emoji: "💀" },];
        const list = document.createElement('ul');
        // Создаем кнопки для каждой иконки
        icons.forEach(icon => {
            const button = document.createElement('button');
            button.textContent = `${icon.emoji} ${icon.name}`;
            button.addEventListener('click', () => {
                this.selectedIcon = icon; // Запоминаем выбранную иконку
                sidebar.style.display = 'none'; // Скрываем сайдбар
                this.setPolygonClickability(false);
            });
            list.appendChild(button);
        });
        sidebar.appendChild(list);
        document.body.appendChild(sidebar);
    }

}

const mapManager = new MapManager();
window.mapManager = mapManager;
mapManager.initMap();
