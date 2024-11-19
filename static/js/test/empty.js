import {exit, sleep} from './func.js'

export async function empty() {
    let sleeper = 200;

    //Тест
    await sleep(sleeper);
    await (async () => {
        if(1){
            console.log("✓ Тест пройден");
        } else {
            exit("✗ Ошибка тестирования");
        }
    })();


}


