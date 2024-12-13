import {getRandomColor} from "./script/helpers.js";

export function drowMarker(data) {
    let id = data.id  || new Date().getTime();
    const marker = L.marker(data.latlng, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div data-id>${data.selectedIcon.emoji}</div>`,
        }),
        draggable: true
    }).addTo(this.map);
    let backgroundColor = data.backgroundColor || getRandomColor();
    let text = data.text ?? '';
    if (window.admin_mode){
        marker.bindPopup(`
            <button onclick="window.mapManager.removeMarker(${id})">Remove</button>
            <button onclick="window.mapManager.toggleMarker(${id})">Toggle</button>
            <textarea onchange="window.mapManager.changeMarkerText(${id}, this)">${text}</textarea>
        `);
    }

    marker._icon.style.opacity = data.show ? 1 : (window.admin_mode) ? 0.5: 0;
    marker._icon.style.backgroundColor = backgroundColor;
    marker.settings = {
        latlng: data.latlng,
        selectedIcon: data.selectedIcon,
        text: text,
        backgroundColor: backgroundColor,
        draggable: true,
        show: !!data.show,
        id: id,
    }
    marker.on('dragend', (e) => {
        document.body.dispatchEvent(new Event('update_config'));
    })
    this.points.set(id, marker);
}

export function createMarkers(config){
    console.log(config.markers)
    if (config.markers){
        config.markers.forEach(markerData => {
            let settings = markerData.settings;
            this.drowMarker({
                id: settings.id,
                selectedIcon: settings.selectedIcon,
                latlng: settings.latlng,
                backgroundColor: settings.backgroundColor,
                show: settings.show,
                text: settings.text,
            })
        });
    }
}

export function updateMarkers(config){
    config.markers.forEach(markerData => {
        let id = markerData.settings.id;
        let marker = this.points.get(id);
        let show = markerData.settings.show
        marker.settings.show = show;
        marker.setLatLng([
            markerData.settings.latlng.lat,
            markerData.settings.latlng.lng,
        ])
        marker._icon.style.opacity = show ? 1 : (window.admin_mode) ? 0.5: 0;
    });
}