
// Функция отображения информационных блоков
export function displayInfoBlocks() {
    document.getElementById('current-round').textContent = this.currentRound;
    document.getElementById('battle-rating').textContent = this.rating;
}

// Обновление информации о текущем и следующем персонаже
export function displayCurrentAndNextTurn(initData) {
    const characters = initData.charactersData.sort((a, b) => parseFloat(b.init) - parseFloat(a.init));

    const currentCharacter = characters.find(character => parseFloat(character.init) == initData.currentCharacterIndex);
    const nextCharacter = characters.find(character => parseFloat(character.init) < initData.currentCharacterIndex) || characters[0];
    initData.nextCharacterIndex = nextCharacter.init;
    document.getElementById('current-round').textContent = initData.currentRound;
    if (currentCharacter) document.getElementById('current-turn').textContent = currentCharacter.name;
    if (nextCharacter) document.getElementById('next-turn').textContent = nextCharacter.name;
}