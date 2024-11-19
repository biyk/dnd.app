import {exit, sleep} from './func.js'

export async function empty() {
    console.log("=== Начало тестирования ===");
    let sleeper = 200;

    //Тест
    await (async () => {
        if(1){
            console.log("✓ Тест пройден");
        } else {
            exit("✗ Ошибка тестирования");
        }
    })();

     await sleep(sleeper);
     console.info("=== Тестирование завершено ===");
}


