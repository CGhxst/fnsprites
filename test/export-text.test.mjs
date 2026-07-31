import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog.js';
import {
    exportHeaderHeight,
    exportThemes,
    tradeGrid,
    tradeList,
} from '../src/export-board.js';

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

test('trade grid uses the formatted emoji output', () => {
    const text = tradeGrid(catalog, store);
    assert.equal(text, `\`\`\`
✅ Owned  👑 Mastered  ❌ Missing  ⬛ Variant does not exist

| BASE | GOLD | Sprite
----------------------
| 👑 | ❌ | Air
| ❌ | ⬛ | Water

Collected: 1/3
Mastered: 1/3
Track yours: https://cghxst.github.io/fnsprites/
\`\`\``);
});

test('image export modes include only themes containing a visible card', () => {
    const sprites = createCatalog([
        { id: 'air_basic', name: 'Air', theme: 'Basic', rarity: 'Rare', unreleased: false },
        { id: 'air_gold', name: 'Gold Air', theme: 'Gold', rarity: 'Special', unreleased: false },
        { id: 'air_candy', name: 'Gummy Air', theme: 'Candy', rarity: 'Special', unreleased: false },
        { id: 'water_basic', name: 'Water', theme: 'Basic', rarity: 'Rare', unreleased: false },
    ]).released;
    const exportStore = {
        isOwned: id => id === 'air_basic' || id === 'air_gold',
        isMastered: id => id === 'air_gold',
    };

    assert.deepEqual(exportThemes(sprites, 'collected', exportStore), ['Basic', 'Gold']);
    assert.deepEqual(exportThemes(sprites, 'missing', exportStore), ['Basic', 'Candy']);
    assert.deepEqual(exportThemes(sprites, 'unmastered', exportStore), ['Basic']);
    assert.deepEqual(exportThemes(sprites, 'mastered', exportStore), ['Gold']);
    assert.deepEqual(exportThemes(sprites, 'trade', exportStore), ['Basic', 'Gold', 'Candy']);
});

test('narrow image exports reserve a non-overlapping compact header', () => {
    assert.equal(exportHeaderHeight(234, 'mastered'), 130);
    assert.equal(exportHeaderHeight(324, 'collected'), 130);
    assert.equal(exportHeaderHeight(324, 'trade'), 158);
    assert.equal(exportHeaderHeight(560, 'collected'), 116);
});
