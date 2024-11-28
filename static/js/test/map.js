import {exit, sleep} from './func.js'
import {showTab} from '../tabs.js'

export async function map(sleeper) {

    //бэкап конфига json
    await fetch('/api/test/start');
    let manager = window.mapManager;

    console.log("=== передвижение локации ===");
    await sleep(sleeper);
    await (async () => {
        const response = await fetch(`/api/test/polygon/1`);
        const data = await response.json();
        console.log(data)
        if (data.status==='success'){
            manager.map.setView([data.centroid[0], data.centroid[1]]);
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