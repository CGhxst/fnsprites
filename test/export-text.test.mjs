import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog.js';
import { exportThemes, tradeGrid, tradeList } from '../src/export-board.js';

const catalog = createCatalog([
    { id: 'air_basic', name: 'Air', theme: 'Basic', rarity: 'Rare', unreleased: false },
    { id: 'air_gold', name: 'Gold Air', theme: 'Gold', rarity: 'Special', unreleased: false },
    { id: 'water_basic', name: 'Water', theme: 'Basic', rarity: 'Rare', unreleased: false },
]);
const store = {
    isOwned: id => id === 'air_basic',
    isMastered: id => id === 'air_basic',
};

test('trade text describes owned and missing variants', () => {
    const text = tradeList(catalog, store);
    assert.match(text, /LOOKING FOR[\s\S]*Air: GOLD/);
    assert.match(text, /HAVE[\s\S]*Air: BASE/);
    assert.match(text, /Collected 1\/3 \| Mastered 1\/3/);
});

test('trade grid uses stable plain-text status markers', () => {
    assert.equal(tradeGrid(catalog, store), [
        '```',
        '✅ Owned  👑 Mastered  ❌ Missing',
        '',
        '| NORMAL | GOLD | Sprite',
        '-----------------------',
        '| 👑 | ❌ | Air',
        '| ❌ | ⬛ | Water',
        '',
        'Collected: 1/3',
        'Mastered: 1/3',
        'Track yours: https://cghxst.github.io/fnsprites/',
        '```',
    ].join('\n'));
});

test('export modes include only theme columns containing visible cards', () => {
    const modeStore = {
        isOwned: id => id === 'air_basic' || id === 'air_gold',
        isMastered: id => id === 'air_basic',
    };

    assert.deepEqual(exportThemes('collected', catalog.released, modeStore), ['Basic', 'Gold']);
    assert.deepEqual(exportThemes('missing', catalog.released, modeStore), ['Basic']);
    assert.deepEqual(exportThemes('unmastered', catalog.released, modeStore), ['Gold']);
    assert.deepEqual(exportThemes('mastered', catalog.released, modeStore), ['Basic']);
    assert.deepEqual(exportThemes('trade', catalog.released, modeStore), ['Basic', 'Gold']);
});
