import {init} from "./test/init.js";
import {empty} from "./test/empty.js";
import {tab} from "./test/tab.js";
export let sleeper = 200;
export async function test(testing = 'all') {
    console.log("=== Начало тестирования ===");
    if (testing === 'all') {
        await empty();
        await tab();
        await init();

    } else if (typeof globalThis[testing] === 'function') {
        // Проверяем, есть ли функция с именем testing
        globalThis[testing](); // Вызываем её
    } else {
        console.error(`Function "${testing}" does not exist.`);
        await init(); // Вызываем init, если функция отсутствует
    }
     console.info("=== Тестирование завершено ===");
}

window.test = test;