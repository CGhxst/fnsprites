import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalog } from '../src/catalog.js';
import { tradeGrid, tradeList } from '../src/export-board.js';

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
    const text = tradeGrid(catalog, store);
    assert.match(text, /Air \| \* \| {2}/);
    assert.match(text, /Water \| {3}\| -/);
});
