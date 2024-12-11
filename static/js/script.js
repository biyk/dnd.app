import {getInit, getConfig, sendPolygonsData, checkForConfigUpdates} from './script/api.js';
import {createNumberedIcon, getParticipantHTML, updateInfoBar} from './script/helpers.js';
import {checkTab} from './tabs.js';
import {drowMarker, createMarkers} from './marker.js';
import {Settings} from './settings.js';
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
        this.measure = {};
        this.settings = null;
    }

    async initMap() {
        const init = await getInit();
        if (!init) return;

        this.mapName = init.map;
        const config = await getConfig(this.mapName);
        if (!config) return;
        this.config = config;
        this.lastUpdated = config.lastUpdated;
        this.measure = config.measure;
        this.initializeMap(config);
        this.createPolygons(config);
        this.createMarkers(config);
        this.setDrawButtonHandler();
        this.setReverseButtonHandler(config);
        this.setMapEventHandlers();
        this.initializeMarkerMenu();
        this.updateInfoBar(config);
        this.settings = new Settings(config.settings);
        this.drawGrid();

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
    createMarkers(config) {
        createMarkers.call(this,config)
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
                } else if (this.polygonPoints.length == 2) {
                    this.polygonMarkers.forEach(marker => this.map.removeLayer(marker));
                    this.measure.points = this.polygonPoints;
                    this.calculateDistanceAndDraw()
                } else {

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

                const marker = L.marker([e.latlng.lat, e.latlng.lng], {
                    icon: createNumberedIcon(this.markerCount),
                    draggable: true
                }).addTo(this.map);
                this.polygonMarkers.push(marker);
            }
            if (this.selectedIcon) {
                // Размещаем маркер с выбранной иконкой
                this.drowMarker({
                    latlng: e.latlng,
                    selectedIcon: this.selectedIcon
                })
                // Сбрасываем выбранную иконку
                this.selectedIcon = null;
                document.querySelector('.marker-menu').style.display = 'block'; // Показываем сайдбар

                this.setPolygonClickability(true);
                this.sendPolygonsData();
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

        document.body.addEventListener('update_config', (e) => {
            this.sendPolygonsData();
        })

    }

    whenReady(){
        checkTab();
        this.SlideMenu =  new SlideMenu();
        this.SlideMenu.initializeMapMarkers(this.map);
    }

    drowMarker(data) {
        drowMarker.call(this, data);
    }

    removeMarker(index) {
        const marker = this.points.get(index);
        if (marker) {
            window.mapManager.map.removeLayer(marker);
            this.points.delete(index);
        }
    }
    toggleMarker(index) {
        const marker = this.points.get(index);
        if (marker) {
            marker._icon.style.display = 'none';
        }
    }

    updateInfoBar(data) {
      updateInfoBar(data);
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

    // Функция для расчета расстояния, добавления маркеров, линии и сетки
    calculateDistanceAndDraw() {
        let points = this.measure.points;
        if (points.length !== 2) {
            console.error('The function requires exactly two points.');
            return;
        }

        const [point1, point2] = points;

        // Добавление маркеров в точки
        const marker1 = L.marker(point1).addTo(this.map);
        const marker2 = L.marker(point2).addTo(this.map);

        // Вычисление расстояния между точками
        const distance = this.map.distance(point1, point2);
        console.log('Point 1:', point1);
        console.log('Point 2:', point2);
        console.log('Distance (meters):', distance);
        this.sendPolygonsData();
        // Рисование сетки
        this.drawGrid();
    }

    // Функция для рисования сетки
    drawGrid() {
        if (this.gridLayer) this.map.removeLayer(this.gridLayer);
        let points = this.measure.points;
        console.log(points, this.settings.show_grid);
        if (points.length !== 2 || !this.settings.show_grid) return;

        const bounds = this.map.getBounds();
        const map = this.map;

        // Определение двух точек и расчёт расстояния между ними в пикселях
        const point1 = map.project([points[0][0], points[0][1]]);
        const point2 = map.project([points[1][0], points[1][1]]);
        const stepPixels = Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2))/4;

        // Определение начальных и конечных точек в пикселях
        const topLeft = map.project(bounds.getNorthWest());
        const bottomRight = map.project(bounds.getSouthEast());

        const lines = [];
        const lines_count = 100
        // Горизонтальные линии
        for (let y = point1.y - lines_count*stepPixels; y <= bottomRight.y; y += stepPixels) {
            const start = map.unproject([topLeft.x, y]);
            const end = map.unproject([bottomRight.x, y]);
            lines.push(L.polyline([
                [start.lat, start.lng],
                [end.lat, end.lng]
            ], { color: 'blue', weight: 1 }));
        }

        // Вертикальные линии
        for (let x = point1.x - lines_count*stepPixels; x <= bottomRight.x; x += stepPixels) {
            const start = map.unproject([x, topLeft.y]);
            const end = map.unproject([x, bottomRight.y]);
            lines.push(L.polyline([
                [start.lat, start.lng],
                [end.lat, end.lng]
            ], { color: 'blue', weight: 1 }));
        }

        this.gridLayer = L.layerGroup(lines).addTo(map);
    }

}

const mapManager = new MapManager();
window.mapManager = mapManager;
mapManager.initMap();
