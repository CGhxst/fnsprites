import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSeasons, createCatalog, familyKey, groupSprites, sortSprites } from '../src/catalog.js';
import { THEME_ORDER, spritePalette } from '../src/config.js';

const sample = [
    { id: 'air_gold', name: 'Gold Air', theme: 'Gold', rarity: 'Special', unreleased: false, season: 'Runners' },
    { id: 'water_basic', name: 'Water', theme: 'Basic', rarity: 'Rare', unreleased: false, season: 'Runners' },
    { id: 'air_basic', name: 'Air', theme: 'Basic', rarity: 'Rare', unreleased: false, season: 'Override' },
    { id: 'water_gold', name: 'Gold Water', theme: 'Gold', rarity: 'Special', unreleased: true, season: 'Override' },
];

test('catalog indexes released sprites and family names', () => {
    const catalog = createCatalog(sample);
    assert.equal(catalog.released.length, 3);
    assert.equal(catalog.familyName('air'), 'Air');
    assert.equal(catalog.byId.get('water_gold').unreleased, true);
    assert.equal(catalog.byId.get('air_basic').season, 'Override');
});

test('familyKey uses the final id segment as the variant', () => {
    assert.equal(familyKey({ id: 'zero_point_basic' }), 'zero_point');
});

test('sprite grouping keeps each family together in theme order', () => {
    const catalog = createCatalog(sample);
    const sorted = sortSprites(catalog.sprites, 'sprite');
    const groups = groupSprites(sorted, 'sprite', catalog);
    assert.deepEqual(groups.map(group => group.key), ['air', 'water']);
    assert.deepEqual(groups[0].sprites.map(sprite => sprite.theme), ['Basic', 'Gold']);
});

test('sprite grouping by season groups items correctly', () => {
    const catalog = createCatalog(sample);
    const sorted = sortSprites(catalog.sprites, 'season');
    const groups = groupSprites(sorted, 'season', catalog);
    assert.deepEqual(groups.map(group => group.key), ['Runners', 'Override']);
    assert.equal(activeSeasons(catalog.sprites).length, 2);
});

test('catalog rejects duplicate ids', () => {
    assert.throws(() => createCatalog([sample[0], sample[0]]), /Duplicate sprite id/);
    assert.throws(() => createCatalog([]), /must not be empty/);
});

test('new and unknown themes keep stable ordering, naming, and palettes', () => {
    const quackCatalog = createCatalog([
        { id: 'duck_quack', name: 'Quack Duck', theme: 'Quack', rarity: 'Special', unreleased: false },
    ]);
    assert.ok(THEME_ORDER.indexOf('Quack') > THEME_ORDER.indexOf('Holofoil'));
    assert.ok(THEME_ORDER.indexOf('Quack') < THEME_ORDER.indexOf('Cube'));
    assert.equal(quackCatalog.familyName('duck'), 'Duck');
    assert.deepEqual(spritePalette(quackCatalog.sprites[0]), ['#788f35', '#202a0d']);
    assert.deepEqual(
        spritePalette({ theme: 'Future', rarity: 'Special' }),
        spritePalette({ theme: 'Basic', rarity: 'Special' }),
    );
});
