export async function test() {
    console.log("=== Начало тестирования ===");
    let sleeper = 200;
    let manager = initiativeManager;

    //проверка, что данные загружаются
    await (async () => {
        await manager.loadInitiativeData()
        if(manager.charactersData.length){
            console.log("✓ Загрузка данных прошла успешно");
        } else {
            console.error("✗ Ошибка при загрузке данных");
        }
    })();

    console.log("=== Клик вперед ===");
    await sleep(sleeper);
    await (async () => {
        const oldData = (manager)=>{
            return {currentCharacterIndex,nextCharacterIndex } = manager
        }
        document.querySelector('.toggle-form-button.next').click();
        await sleep(sleeper);
        const newData = (manager)=>{
            return {currentCharacterIndex,nextCharacterIndex } = manager
        }
        if (oldData.currentCharacterIndex !== newData.currentCharacterIndex || oldData.nextCharacterIndex === newData.currentCharacterIndex) {
            console.log("✓ Кнопка Next работает");
        } else {
            console.error("✗ Кнопка Next не работает",newData,oldData);
        }
    })();


    console.log("=== Клик назад ===");
    await sleep(sleeper);
     await (async () => {
         const oldIndex = manager.currentCharacterIndex;
         document.querySelector('.toggle-form-button.prev').click();
         await sleep(sleeper);
         const newIndex = manager.currentCharacterIndex;
         if (oldIndex !== newIndex) {
             console.log("✓ Кнопка Prev работает");
         } else {
             console.error("✗ Кнопка Prev не работает");
         }
     })();

     console.log("=== добавление персонажа ===");
     await sleep(sleeper);
     await (async () => {
         let count = initiativeManager.charactersData.length;
         const addCharacter = document.querySelector(".toggle-form-button.add");
         addCharacter.click();

         document.getElementById('new-init').value = '30';//с самой большой инициативой чтобы был в самом верху
         document.getElementById('new-name').value = 'Персонаж для Теста';
         document.getElementById('new-cd').value = '15';
         document.getElementById('new-hp-now').value = 20;
         document.getElementById('new-hp-max').value = 30;
         document.getElementById('new-surprise').checked = true;
         document.getElementById('new-npc').checked = true;
         document.getElementById('new-experience').value = '20';

         const saveCharacter = document.getElementById("add-character-button");
         saveCharacter.click();
         await sleep(sleeper);
         const count2 = initiativeManager.charactersData.length;
         if (count !== count2) {
             console.log("✓ Кнопка Добавить персонажа работает");
         } else {
             console.error("✗ Кнопка Добавить персонажа не работает");
         }

     })();


    console.log("=== изменение данных пользователя (здоровье) ===");
    await sleep(sleeper);
     await (async () => {
         let tempPrompt = window.prompt;
         let newName = "1";
         window.prompt = () => newName;

         const firstCharacterNameSpan = document.querySelector('.editable-value.hp_now');
         firstCharacterNameSpan.click();
         await sleep(sleeper);

         if (manager.charactersData[0].hp_now === newName) {
             console.log("✓ Изменение данных персонажа работает");
         } else {
             console.error("✗ Изменение данных персонажа не работает");
         }

         window.prompt = tempPrompt; // Восстановление оригинальной функции
     })();

     console.log("=== определение текущего персонажа ===");
     await sleep(sleeper);
    await (async () => {
        const current = manager.charactersData.find(c => parseFloat(c.init) === manager.currentCharacterIndex);
        if (current) {
            console.log("✓ Текущий персонаж корректно определен");
        } else {
            console.error("✗ Ошибка в определении текущего персонажа");
        }
    })();

    console.log("=== Проверка восстановления здоровья ===");
    await sleep(sleeper);
    await (async () => {
        const testCharacter = manager.charactersData[0];
        testCharacter.hp_now = 1; // Умышленно уменьшаем здоровье
        manager.healCharacter(0);
        await sleep(sleeper);

        if (testCharacter.hp_now === testCharacter.hp_max) {
            console.log("✓ Восстановление здоровья работает");
        } else {
            console.error("✗ Восстановление здоровья не работает");
        }


        console.log("=== Проверка удаления персонажа ===");
        await sleep(sleeper);
        const initialLength = manager.charactersData.length;
        manager.deleteCharacter(0);
        await sleep(sleeper);

        if (manager.charactersData.length === initialLength - 1) {
            console.log("✓ Удаление персонажа работает");
        } else {
            console.error("✗ Удаление персонажа не работает");
        }
    })();
    await sleep(sleeper);

    console.log("=== Поиск монстра и подстановка данных в форму ===");
    await sleep(sleeper);
    await (async () => {
        // Шаг 1: Получаем ссылку на строку поиска
        const npcInput = document.getElementById('npc-input');
        const npcList = document.getElementById('npc-list');

        // Шаг 2: Вводим имя монстра в строку поиска
        const searchQuery = "Гоблин"; // Используйте имя, которое точно есть в базе данных монстров
        npcInput.value = searchQuery;
        npcInput.dispatchEvent(new Event('input'));

        // Ожидаем обновления списка монстров после поиска
        await sleep(1000);

        // Проверяем, что список монстров обновился и содержит результаты
        if (npcList.innerHTML.trim().length > 0) {
            console.log("✓ Список монстров обновился");

            // Шаг 3: Клик по первому найденному монстру
            const firstNpc = npcList.querySelector('li');
            if (firstNpc) {
                firstNpc.click();
                await sleep(sleeper);

                // Шаг 4: Проверка, что данные монстра подставились в форму
                const nameInput = document.getElementById('new-name');
                const cdInput = document.getElementById('new-cd');
                const hpNowInput = document.getElementById('new-hp-now');
                const hpMaxInput = document.getElementById('new-hp-max');
                const expInput = document.getElementById('new-experience');

                if (nameInput.value) {
                    console.log("✓ Данные монстра подставились в форму корректно");
                } else {
                    console.error("✗ Данные монстра не подставились в форму");
                }
            } else {
                console.error("✗ Не удалось найти монстра в списке");
            }
        } else {
            console.error("✗ Список монстров пустой или не обновился");
        }
    })();
    console.info("=== Тестирование завершено ===");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.test = test;