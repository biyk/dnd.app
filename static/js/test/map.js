import {exit, sleep} from './func.js'
import {showTab} from '../tabs.js'

export async function map(sleeper) {

    //бэкап конфига json
    showTab('map')
    await fetch('/api/test/start');
    let manager = window.mapManager;
    console.log("=== передвижение локации ===");
    await sleep(sleeper);
    await (async () => {
        let test_poligon = manager.config.polygons[1];
        let code = test_poligon.code;
        if (!code){
             await fetch('/api/test/end');
             exit("✗ Коды полигонов не заданы");
        }
        const response = await fetch(`/api/test/polygon/${code}`);
        const data = await response.json();
        if (data.status==='success'){
            const isVisible = test_poligon.isVisible
            console.log(isVisible)
            manager.map.setView([data.centroid[0], data.centroid[1]],manager.config.maxLevel);
            await fetch(`/api/test/click`);
            await sleep(sleeper+300);
            console.log(isVisible,  window.mapManager.polygons[1])
            if(isVisible!==window.mapManager.config.polygons[1].isVisible){
                console.log("✓ Видимость полигона изменена");
            } else {
                //await fetch('/api/test/end');
                exit("✗ Полигон не изменил видимость");
            }
        }

        if(1){
            console.log("✓ Тест пройден");
        } else {
            exit("✗ Ошибка тестирования");
        }
    })();
    //деактивация полигона
    //активация полигона
    //рисование полигона


    await fetch('/api/test/end');
}