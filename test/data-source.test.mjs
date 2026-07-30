import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSourceCatalog } from '../scripts/read-source-catalog.mjs';

test('source catalog parser reads literal sprite data', () => {
    const sprites = parseSourceCatalog(`
        const baseSprites = [
            { id: "air_basic", name: "Air", theme: "Basic", rarity: "Rare", unreleased: false },
        ];
    `);
    assert.deepEqual(sprites, [
        { id: 'air_basic', name: 'Air', theme: 'Basic', rarity: 'Rare', unreleased: false },
    ]);
});

test('source catalog parser never evaluates expressions', () => {
    assert.throws(() => parseSourceCatalog(`
        const baseSprites = [{ id: process.exit(1) }];
    `), /literal data only/i);
});

