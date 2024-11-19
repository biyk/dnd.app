import {init} from "./test/init.js";

export async function test(testing = 'all') {
    if (testing === 'all') {
        await init();
    } else if (typeof globalThis[testing] === 'function') {
        // Проверяем, есть ли функция с именем testing
        globalThis[testing](); // Вызываем её
    } else {
        console.error(`Function "${testing}" does not exist.`);
        await init(); // Вызываем init, если функция отсутствует
    }
}
