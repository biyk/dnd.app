const assert = require('assert');
const InitiativeManager = require('../static/js/init');

describe('InitiativeManager', function() {
    let manager;

    beforeEach(function() {
        manager = new InitiativeManager();
        manager.loadInitiativeData();
    });

    it('should load initiative data correctly', function() {
        assert.strictEqual(manager.initData.charactersData.length, 2);
        assert.strictEqual(manager.initData.charactersData[0].name, 'Character 1');
    });

    it('should reset the initiative index', function() {
        manager.nextTurn();
        manager.resetInitiative();
        assert.strictEqual(manager.initData.currentCharacterIndex, 0);
    });

    it('should advance to the next turn correctly', function() {
        manager.nextTurn();
        assert.strictEqual(manager.initData.currentCharacterIndex, 1);
        manager.nextTurn();
        assert.strictEqual(manager.initData.currentCharacterIndex, 0);
    });
});