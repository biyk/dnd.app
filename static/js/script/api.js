
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

  export function sendPolygonsData() {
    if (!this.admin_mode) return;

    const polygonsData = this.polygons.map(polygon => ({
      points: polygon.points,
      code: polygon.code,
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
      .then((data) => {
        console.log("Data sent successfully:", data)
        this.config = data.updatedConfig;
      })
      .catch(error => console.error("Error sending polygons data:", error));
  }

  export async function checkForConfigUpdates() {
    const config = await getConfig(this.mapName);


    if (config && config.lastUpdated !== this.lastUpdated) {
      this.lastUpdated = config.lastUpdated;
      this.createPolygons(config);
      setAudio(config);
      startCountdown(config.timer);
      updateSkullColor(config.init.rating);
      updateInfoBar(config);
      this.map.setView([config.mapState.center.lat, config.mapState.center.lng], config.mapState.zoom);
      console.log("Map data updated due to configuration change.");
    }
  }