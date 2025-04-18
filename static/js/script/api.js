
// Функция для получения начальной конфигурации
import {setAudio, updateInfoBar} from "./helpers.js";
import {GoogleSheetDB, spreadsheetId, Table} from "../db/google.js";

export async function getInit() {
    let api = window.GoogleSheetDB || new GoogleSheetDB();
    await api.waitGoogle();
    let configTable = new Table({
        list: 'CONFIG',
        spreadsheetId: spreadsheetId
    });

    let data = await configTable.getAll({formated:true});
    return {map: data.map};
}

// Функция для получения конфигурации карты по имени
export async function getConfig(mapName) {
    const response = await fetch(`/api/configs/${mapName}`);
    let result = null;
    if (response.ok) {
        result = response.json();
    } else {
        console.error(`Error fetching map config for ${mapName}`);
    }
    return result;

}

export function sendData(type='polygons') {
    if (!window.admin_mode) {
        return true;
    }
    const polygonsData = this.polygons.map(polygon => ({
        points: polygon.points,
        code: polygon.code,
        isVisible: polygon.layer.isVisible,
    }));
    const markerData = Array.from(this.points.values()).map(point => {
        point.settings.latlng = point._latlng
        return {
            settings: point.settings,
        };
    });
    const center = this.map.getCenter();
    const zoomLevel = this.map.getZoom();
    const body = {mapName: this.mapName};
    switch (type) {
        case 'polygons':
            body.polygons = polygonsData;
            body.mainPolygon = this.mainPolygon ? { points: this.mainPolygon.getLatLngs() } : null;
            break;
        case 'markers':
            body.markers = markerData;
            break;
        case 'measure':
            body.measure = this.measure;
            break;
        case 'settings':
            body.settings = this.settings;
            break;
        case 'mapState':
            body.mapState = {
                center: {lat: center.lat, lng: center.lng},
                zoom: zoomLevel,
            };
            break;
    }
    fetch('/api/polygons', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
        .then(response => response.json())
        .then((data) => {
            this.config = data.updatedConfig;
        })
        .catch(error => console.error(`Error sending ${type} data:`, error));
}

export function sendPolygonsData() {
    if (!window.admin_mode)
    {
        return true;
    }
    const polygonsData = this.polygons.map(polygon => ({
        points: polygon.points,
        code: polygon.code,
        isVisible: polygon.layer.isVisible,
    }));
    const markerData = Array.from(this.points.values()).map(point => {
        point.settings.latlng = point._latlng
        return {
            settings: point.settings,
        };
    });
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
            markers: markerData,
            measure: this.measure,
            settings: this.settings,
            mainPolygon: this.mainPolygon ? { points: this.mainPolygon.getLatLngs() } : null,
            mapState: {
                center: { lat: center.lat, lng: center.lng },
                zoom: zoomLevel,
            },
        }),
    })
        .then(response => response.json())
        .then((data) => {
            this.config = data.updatedConfig;
        })
        .catch(error => console.error("Error sending polygons data:", error));
}

export async function checkForConfigUpdates() {
    if (window.admin_mode) return;
    const config = await getConfig(this.mapName);

    if (config && config.lastUpdated !== this.lastUpdated) {
        this.lastUpdated = config.lastUpdated;
        this.createPolygons(config);
        setAudio(config);
        if (typeof startCountdown !=='undefined') startCountdown(config.timer);
        if (typeof updateSkullColor !=='undefined') updateSkullColor(config.init.rating);
        if (typeof updateInfoBar !=='undefined') updateInfoBar(config);
        this.measurePoints = config.measure.points;
        this.settings.updateSettings(config.settings);
        this.map.setView([config.mapState.center.lat, config.mapState.center.lng], config.mapState.zoom);
        this.drawGrid();
        this.updateMarkers(config)
        console.log("Map data updated due to configuration change.");
    }
}