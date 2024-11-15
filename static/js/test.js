export async function test() {
    console.log("=== Начало тестирования ===");

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
    await sleep(200);
    //---проверка работы интерфейса
    //Клик вперед
    await (async () => {
        const oldData = (manager)=>{
            return {currentCharacterIndex,nextCharacterIndex } = manager
        }
        document.querySelector('.toggle-form-button.next').click();
        await sleep(200);
        const newData = (manager)=>{
            return {currentCharacterIndex,nextCharacterIndex } = manager
        }
        if (oldData.currentCharacterIndex !== newData.currentCharacterIndex || oldData.nextCharacterIndex === newData.currentCharacterIndex) {
            console.log("✓ Кнопка Next работает");
        } else {
            console.error("✗ Кнопка Next не работает",newData,oldData);
        }
    })();
     await sleep(200);

     await (async () => {
         const oldIndex = manager.currentCharacterIndex;
         document.querySelector('.toggle-form-button.prev').click();
         await sleep(200);
         const newIndex = manager.currentCharacterIndex;
         if (oldIndex !== newIndex) {
             console.log("✓ Кнопка Prev работает");
         } else {
             console.error("✗ Кнопка Prev не работает");
         }
     })();

     //добавление персонажа и тестирование на нем

     await sleep(200);
        // клик на изменение данных пользователя (здоровье)
     await (async () => {
         let tempPrompt = window.prompt;
         let newName = "Тестовый Персонаж";
         window.prompt = () => newName;

         const firstCharacterNameSpan = document.querySelector('.editable-value');
         firstCharacterNameSpan.click();
         await sleep(200);

         if (manager.charactersData[0].name === newName) {
             console.log("✓ Изменение данных персонажа работает");
         } else {
             console.error("✗ Изменение данных персонажа не работает");
         }

         window.prompt = tempPrompt; // Восстановление оригинальной функции
     })();
    await sleep(200);
    await (async () => {
        const current = manager.charactersData.find(c => parseFloat(c.init) === manager.currentCharacterIndex);
        if (current) {
            console.log("✓ Текущий персонаж корректно определен");
        } else {
            console.error("✗ Ошибка в определении текущего персонажа");
        }
    })();
    await sleep(200);

    await (async () => {
        // Проверка восстановления здоровья
        const testCharacter = manager.charactersData[0];
        testCharacter.hp_now = 1; // Умышленно уменьшаем здоровье
        manager.healCharacter(0);
        await sleep(200);

        if (testCharacter.hp_now === testCharacter.hp_max) {
            console.log("✓ Восстановление здоровья работает");
        } else {
            console.error("✗ Восстановление здоровья не работает");
        }


        const initialLength = manager.charactersData.length;
        manager.deleteCharacter(0);
        await sleep(200);

        if (manager.charactersData.length === initialLength - 1) {
            console.log("✓ Удаление персонажа работает");
        } else {
            console.error("✗ Удаление персонажа не работает");
        }
    })();
    await sleep(200);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

window.test = test;