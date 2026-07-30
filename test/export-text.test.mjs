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

test('trade grid uses the emoji table format', () => {
    const text = tradeGrid(catalog, store);
    assert.match(text, /^```\n✅ Owned {2}👑 Mastered {2}❌ Missing/);
    assert.match(text, /\| 👑 \| ❌ \| Air/);
    assert.match(text, /\| ❌ \| ⬛ \| Water/);
    assert.match(text, /Collected: 1\/3/);
    assert.match(text, /Mastered: 1\/3/);
    assert.match(text, /```$/);
});

test('filtered image exports omit themes with no visible cards', () => {
    assert.deepEqual(exportThemes('collected', catalog, store), ['Basic']);
    assert.deepEqual(exportThemes('mastered', catalog, store), ['Basic']);
    assert.deepEqual(exportThemes('missing', catalog, store), ['Basic', 'Gold']);
});
