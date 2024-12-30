
// Функция для получения начальной конфигурации
import {setAudio, updateInfoBar} from "./helpers.js";

export async function getInit() {
    const response = await fetch('/api/config');
    if (response.ok) {
        return response.json();
    } else {
        console.error("Error fetching initial config");
        return null;
    }
}

// Функция для получения конфигурации карты по имени
export async function getConfig(mapName) {
    const response = await fetch(`/api/configs/${mapName}`);
    if (response.ok) {
        return response.json();
    } else {
        console.error(`Error fetching map config for ${mapName}`);
        return null;
    }
}

function sendMakerData() {
    let id = localStorage.getItem('auth_code');

    if (!id) return false;
    let point = this.points.get(parseInt(id));
     point.settings.latlng = point._latlng
    console.log(point)
    if (!point) return false;
        fetch('/api/point', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            mapName: this.mapName,
            point: point.settings,
        }),
    })
        .then(response => response.json())
        .then((data) => {
            this.config = data.updatedConfig;
        })
        .catch(error => console.error("Error sending marker data:", error));;
}

export function sendPolygonsData() {
    if (!window.admin_mode)
    {
        //sendMakerData.call(this);
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