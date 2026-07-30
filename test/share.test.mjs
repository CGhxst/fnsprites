import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeLegacyShare, decodeShare, encodeShare } from '../src/share.js';

test('share data round-trips with stable sprite ids', () => {
    const snapshot = {
        owned: ['air_basic', 'water_gold'],
        mastered: ['air_basic'],
    };
    assert.deepEqual(decodeShare(encodeShare(snapshot)), snapshot);
});

test('invalid share data is rejected', () => {
    assert.equal(decodeShare('not-valid-data'), null);
});

test('legacy bitset links remain readable', () => {
    const sprites = [{ id: 'one_basic' }, { id: 'two_basic' }, { id: 'three_basic' }];
    assert.deepEqual(decodeLegacyShare('o~g', sprites), {
        owned: ['one_basic', 'three_basic'],
        mastered: ['one_basic'],
    });
});

