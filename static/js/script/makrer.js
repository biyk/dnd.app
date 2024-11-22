export function initializeMarkers(){
    let config = this.config;
    let map = this.map;
}

export class SlideMenu {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.markers = [];
    this.createMenu();
    document.getElementById('marker-button').addEventListener('click', (e) => {
      this.toggle();
    })
  }

  createMenu() {
    const menu = document.createElement('div');
    menu.classList.add('marker-menu');
    menu.innerHTML = `
      <button style="position: absolute; left: -50px; top: 20px;" onclick="window.SlideMenu.toggle()">☰</button>
      ${['Draggable', 'Removable'].map(type => `
        <div>
          <button onclick="window.SlideMenu.startAdding('${type.toLowerCase()}')">${type}</button>
        </div>
      `).join('')}
    `;
    document.body.appendChild(menu);
    this.menu = menu;
  }

  toggle() {
    console.log('toggle');
    this.menu.style.right = this.menu.style.right === '0px' ? '-33%' : '0px';
  }

  startAdding(type) {
    this.toggle();
    window.mapManager.map.once('click', e => {
      const marker = L.marker(e.latlng, { draggable: type === 'draggable' }).addTo(window.mapManager.map);
      marker.bindPopup(`
        ${type} marker
        <button onclick="window.SlideMenu.removeMarker(${this.markers.length})">Remove</button>
      `);
      this.markers.push(marker);
    });
  }

  removeMarker(index) {
    const marker = this.markers[index];
    if (marker) {
      window.mapManager.map.removeLayer(marker);
      this.markers.splice(index, 1);
    }
  }
}

window.SlideMenu =  new SlideMenu();