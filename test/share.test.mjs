import test from 'node:test';
import assert from 'node:assert/strict';
import {
    decodeLegacyJsonShare,
    decodeLegacyShare,
    decodeShare,
    encodeShare,
} from '../src/share.js';

const spriteIds = ['air_basic', 'air_gold', 'water_basic', 'water_gold'];

function encodeLegacyJson(snapshot) {
    const json = JSON.stringify({ v: 2, o: snapshot.owned, m: snapshot.mastered });
    return Buffer.from(json).toString('base64url');
}

test('packed share data round-trips all collection states', () => {
    const snapshot = {
        owned: ['air_basic', 'water_gold'],
        mastered: ['air_basic'],
    };
    const code = encodeShare(snapshot, spriteIds);
    assert.deepEqual(decodeShare(code, spriteIds), snapshot);
});

test('packed links treat appended catalog entries as missing', () => {
    const snapshot = { owned: ['air_basic', 'water_basic'], mastered: ['water_basic'] };
    const code = encodeShare(snapshot, spriteIds);
    const changedCatalog = [...spriteIds, 'new_basic'];
    const decoded = decodeShare(code, changedCatalog);

    assert.deepEqual(decoded.owned, snapshot.owned);
    assert.deepEqual(decoded.mastered, snapshot.mastered);
});

test('packed links restore the shared status tab without growing the limit', () => {
    const snapshot = { owned: ['air_basic'], mastered: [] };
    const code = encodeShare(snapshot, spriteIds, 'missing');

    assert.ok(code.length <= 32);
    assert.deepEqual(decodeShare(code, spriteIds), { ...snapshot, status: 'missing' });
});

test('packed links approach the three-state information limit', () => {
    const sprites = Array.from({ length: 118 }, (_, index) => `sprite_${index}`);
    const snapshot = {
        owned: sprites.filter((_, index) => index % 2 === 0),
        mastered: sprites.filter((_, index) => index % 4 === 0),
    };
    const code = encodeShare(snapshot, sprites);

    assert.ok(code.length <= 32);
    assert.deepEqual(decodeShare(code, sprites), snapshot);
});

test('empty collections produce valid compact links', () => {
    const code = encodeShare({ owned: [], mastered: [] }, spriteIds);
    assert.equal(code, '');
    assert.deepEqual(decodeShare(code, spriteIds), { owned: [], mastered: [] });
});

test('version 2 JSON links remain readable', () => {
    const snapshot = { owned: ['air_basic'], mastered: ['air_basic'] };
    assert.deepEqual(decodeLegacyJsonShare(encodeLegacyJson(snapshot)), snapshot);
});

test('invalid share data is rejected', () => {
    assert.equal(decodeShare('not-valid-data', spriteIds), null);
    assert.equal(decodeShare('5.invalid~', spriteIds), null);
});

test('legacy unversioned bitset links remain readable', () => {
    const sprites = [{ id: 'one_basic' }, { id: 'two_basic' }, { id: 'three_basic' }];
    assert.deepEqual(decodeLegacyShare('o~g', sprites), {
        owned: ['one_basic', 'three_basic'],
        mastered: ['one_basic'],
    });
    assert.deepEqual(decodeLegacyShare('o~', sprites), {
        owned: ['one_basic', 'three_basic'],
        mastered: [],
    });
});
