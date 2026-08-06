import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCollections } from '../src/compare.js';

const released = [
    { id: 'air_basic' },
    { id: 'air_gold' },
    { id: 'water_basic' },
];

test('collection comparison finds both trade directions in catalog order', () => {
    assert.deepEqual(
        compareCollections(
            ['air_basic', 'air_basic', 'unknown_basic'],
            ['water_basic', 'air_gold', 'unknown_gold'],
            released,
        ),
        {
            youCanOffer: ['air_basic'],
            theyCanOffer: ['air_gold', 'water_basic'],
        },
    );
});

test('collection comparison handles empty lockers', () => {
    assert.deepEqual(compareCollections([], ['air_basic'], released), {
        youCanOffer: [],
        theyCanOffer: ['air_basic'],
    });
});
