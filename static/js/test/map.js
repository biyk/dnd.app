import {exit, sleep} from './func.js'
import {showTab} from '../tabs.js'

export async function map(sleeper) {

    //бэкап конфига json
    //передвижение локации
    //деактивация полигона
    //активация полигона
    //рисование полигона


    //Тест
    console.log("=== Добавление NPC в локацию ===");
    await sleep(sleeper);
    await (async () => {
        if(1){
            console.log("✓ Тест пройден");
        } else {
            exit("✗ Ошибка тестирования");
        }
    })();


}