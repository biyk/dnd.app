import {getRandomColor} from "./script/helpers.js";

export function drowMarker(data) {
    let id = data.id  || new Date().getTime();
    const marker = L.marker(data.latlng, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: `<span class="custom-marker-number" >${data.selectedIcon.number || ''}</span><div style="width: 60px;" data-id="${id}">${data.selectedIcon.emoji}</div>`,
        }),
        draggable: window.admin_mode //|| parseInt(id) === parseInt(localStorage.getItem('auth_code'))
    }).addTo(this.map);
    let backgroundColor = data.backgroundColor || data.selectedIcon.backgroundColor || getRandomColor();
    let text = data.text ?? '';
    if (window.admin_mode){
        marker.bindPopup(`
               <button onclick="window.mapManager.removeMarker(${id})">Remove</button>
               <button onclick="window.mapManager.toggleMarker(${id})">Toggle</button>
               <textarea style="width: 300px;" onchange="window.mapManager.changeMarkerText(${id}, this)">${text}</textarea>
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
    marker.on('popupopen', (e) => {
        let popup = marker._popup._contentNode.getElementsByTagName('textarea')[0];
        console.log(popup.style.height = popup.scrollHeight + 'px');
    })
    this.points.set(id, marker);
}

export function createMarkers(config){
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
        const input_number = document.createElement('input');
        input_icon.style.width = '100px';
        input_number.style.width = '30px';
        save.innerHTML = 'Save';
        save.value = id;
        button.dataset.id = id;
        button.classList.add('point-button', 'js-go-to-point');
        save.classList.add('point-button');
        button.innerHTML = data.settings.selectedIcon.emoji;
        input_icon.value = data.settings.selectedIcon.emoji;
        button.style.backgroundColor = data.settings.backgroundColor;
        input_name.value = data.settings.selectedIcon.name;
        input_number.value = data.settings.selectedIcon.number ?? '';
        point_div.appendChild(input_icon);
        point_div.appendChild(input_name);
        point_div.appendChild(input_number);
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
            point.settings.selectedIcon.number = input_number.value;
            document.body.dispatchEvent(new Event('update_config'));
        });
        list.appendChild(point_div);
    });
    let adding = document.createElement('div');
    let add_input = document.createElement('input');
    let add_name = document.createElement('input');
    let add_number = document.createElement('input');
    let add_color = document.createElement('input');
    let add_button = document.createElement('button');
    let color = getRandomColor();
    add_color.value = color;
    add_color.style.backgroundColor = color;
    add_color.addEventListener('keyup', ()=>{
        add_color.style.backgroundColor = add_color.value;
    });
    add_input.style.width = '100px';
    add_number.style.width = '30px';
    add_button.innerHTML = `Добавить`;
    add_button.addEventListener('click', () => {
        this.selectedIcon = {
            name: add_name.value,
            number: add_number.value,
            emoji: add_input.value,
            backgroundColor: add_color.value
        }; // Запоминаем выбранную иконку
        sidebar.style.display = 'none'; // Скрываем сайдбар
        this.setPolygonClickability(false);
    });
    adding.appendChild(add_button);
    adding.appendChild(add_input);
    adding.appendChild(add_name);
    adding.appendChild(add_number);
    adding.appendChild(add_color);
    list.appendChild(adding);
    sidebar.appendChild(list);
    document.body.appendChild(sidebar);
}