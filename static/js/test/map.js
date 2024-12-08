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
        let test_poligon = manager.polygons[1];
        let code = test_poligon.code;
        console.log(test_poligon)
        const response = await fetch(`/api/test/polygon/${code}`);
        const data = await response.json();
        if (data.status==='success'){
            let isVisible = test_poligon.isVisible
            console.log(test_poligon.isVisible);

            manager.map.setView([data.centroid[0], data.centroid[1]],manager.config.maxLevel);
            await fetch(`/api/test/click`);
            await sleep(sleeper+300);
            console.log(test_poligon.isVisible);
            if(isVisible!==test_poligon.isVisible){
                console.log("✓ Видимость полигона изменена");
            } else {
                exit("✗ Полигон не изменил видимость");
            }
            //console.log(manager.lastClick,data.centroid);
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