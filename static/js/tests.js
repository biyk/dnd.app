import {init} from "./test/init.js";
import {empty} from "./test/empty.js";
import {tab} from "./test/tab.js";
import {location} from "./test/location.js";
const sleeper = 200;

// Объект с функциями
const tests = { empty, tab, init, location };

export async function test(testing = 'all') {
    console.log("=== Начало тестирования ===");
    //await fetch('/api/test/start');
    if (testing === 'all') {
        await empty(sleeper);
        await tab(sleeper);
        await init(sleeper);
        await location(sleeper);
    } else if (typeof tests[testing] === 'function') {
        // Вызываем функцию из объекта tests
        await tests[testing](sleeper);
    } else {
        console.error(`Function "${testing}" does not exist.`);
    }
     console.info("=== Тестирование завершено ===");
    //await fetch('/api/test/end');
}

window.test = test;