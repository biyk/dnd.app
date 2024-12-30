import {getRandomColor} from "./script/helpers.js";

export function drowMarker(data) {
    let id = data.id  || new Date().getTime();
    const marker = L.marker(data.latlng, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<div data-id="${id}">${data.selectedIcon.emoji}</div>`,
        }),
        draggable: window.admin_mode //|| parseInt(id) === parseInt(localStorage.getItem('auth_code'))
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

export function initializeMarkerMenu(){
    const sidebar = document.createElement('div');
    sidebar.classList.add('marker-menu', 'side-menu');
    this.menu = sidebar;
    const list = document.createElement('ul');
    // Создаем кнопки для каждой иконки
    this.points.forEach((data,id) => {
        let icon = data.settings.selectedIcon
        const point_div = document.createElement('div');
        const button = document.createElement('button');
        const save = document.createElement('button');
        const input_icon = document.createElement('input');
        const input_name = document.createElement('input');
        save.innerHTML = 'Save';
        save.value = id;
        button.dataset.id = id;
        button.classList.add('point-button', 'js-go-to-point');
        save.classList.add('point-button');
        button.innerHTML = data.settings.selectedIcon.emoji;
        input_icon.value = data.settings.selectedIcon.emoji;
        button.style.backgroundColor = data.settings.backgroundColor;
        input_name.value = data.settings.selectedIcon.name;
        point_div.appendChild(input_icon);
        point_div.appendChild(input_name);
        point_div.appendChild(button);
        point_div.appendChild(save);
        button.addEventListener('click', () => {
            let id = data.settings.id;
            let point = this.points.get(id);
            let latlng = point.settings.latlng;
            navigator.clipboard.writeText(data.settings.backgroundColor)
            this.map.setView([latlng.lat, latlng.lng]);
        });
        save.addEventListener('click', () => {
            let id = data.settings.id;
            let point = this.points.get(id);
            let icon = document.querySelector(`[data-id='${id}'].js-go-to-point`);
            let new_icon = input_icon.value;
            icon.innerHTML = new_icon;
            point.settings.selectedIcon.emoji = new_icon;
            point.settings.selectedIcon.name = input_name.value;
            document.body.dispatchEvent(new Event('update_config'));
        });
        list.appendChild(point_div);
    });
    let adding = document.createElement('div');
    let add_input = document.createElement('input');
    let add_name = document.createElement('input');
    let add_color = document.createElement('input');
    let add_button = document.createElement('button');
    add_button.innerHTML = `Добавить`;
    add_button.addEventListener('click', () => {
        this.selectedIcon = {
            name: add_name.value,
            emoji: add_input.value,
            color: add_color.value
        }; // Запоминаем выбранную иконку
        sidebar.style.display = 'none'; // Скрываем сайдбар
        this.setPolygonClickability(false);
    });
    adding.appendChild(add_button);
    adding.appendChild(add_input);
    adding.appendChild(add_name);
    list.appendChild(adding);
    sidebar.appendChild(list);
    document.body.appendChild(sidebar);
}