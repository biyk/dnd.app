export class Settings {
    constructor(settings = {}) {
        this.show_grid = settings.show_grid || false;
        this.initHandlers()
        this.Listner = document.body;
    }

    initHandlers() {
        let show_grid = document.getElementById('settings-show-grid');
        if (!show_grid) return false;
        show_grid.checked = this.show_grid;
        show_grid.addEventListener('change', () => {
            this.show_grid = show_grid.checked;
             this.Listner.dispatchEvent(new Event('update_config'));
        })
    }

    updateSettings(settings = {}) {
        this.show_grid = settings.show_grid || false;
    }
}