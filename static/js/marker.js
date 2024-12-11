export function drowMarker(data) {
    let id = data.id  || new Date().getTime();
    const marker = L.marker(data.latlng, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div data-id>${data.selectedIcon.emoji}</div>`,
        }),
        draggable: true
    }).addTo(this.map);

    let HideShoeText = data.show ?'Hide' : 'Show';
    marker.bindPopup(`
                     <button onclick="window.mapManager.removeMarker(${id})">Remove</button>
                     <button onclick="window.mapManager.toggleMarker(${id})">${HideShoeText}</button>
                   `);
    marker.settings = {
        latlng: data.latlng,
        selectedIcon: data.selectedIcon,
        draggable: true
    }
    this.points.set(id, marker);
}

export function createMarkers(config){
    console.log(config.markers)
    if (config.markers){
        config.markers.forEach(markerData => {
            console.log(markerData)
            let settings = markerData.settings;
            this.drowMarker({
                id: settings.id,
                selectedIcon: settings.selectedIcon,
                latlng: settings.latlng,
            })
        });
    }
}