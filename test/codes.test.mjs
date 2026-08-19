import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSourceCodes } from '../scripts/read-source-catalog.mjs';

class MemoryStorage {
    constructor(seed = {}) {
        this.values = new Map(Object.entries(seed));
    }

    getItem(key) {
        return this.values.has(key) ? this.values.get(key) : null;
    }

    setItem(key, value) {
        this.values.set(key, String(value));
    }

    removeItem(key) {
        this.values.delete(key);
    }
}

globalThis.localStorage = new MemoryStorage();
const { CodesStore, hasUnredeemedCodes } = await import('../src/codes-store.js');

test('parseSourceCodes extracts literal code declarations', () => {
    const sample = `
        const baseCodes = [
            { code: "TEST1", reward: "Special Sprite", source: "Twitter", link: "https://x.com", active: true },
            { code: "TEST2", reward: "XP", source: "Discord", link: "", active: false }
        ];
    `;
    const result = parseSourceCodes(sample);
    assert.equal(result.length, 2);
    assert.equal(result[0].code, 'TEST1');
    assert.equal(result[0].reward, 'Special Sprite');
    assert.equal(result[0].source, 'Twitter');
    assert.equal(result[0].link, 'https://x.com');
    assert.equal(result[0].active, true);
    assert.equal(result[1].code, 'TEST2');
    assert.equal(result[1].active, false);
});

test('parseSourceCodes throws on missing declaration', () => {
    assert.throws(() => parseSourceCodes('const other = [];'), /codes-data.js must declare baseCodes/);
});

test('CodesStore toggles code redemption state and persists to storage', () => {
    globalThis.localStorage = new MemoryStorage();
    const store = new CodesStore();
    assert.equal(store.hideRedeemed, false);
    assert.equal(store.isRedeemed('CODE1'), false);

    store.toggleRedeem('CODE1');
    assert.equal(store.isRedeemed('CODE1'), true);
    assert.equal(globalThis.localStorage.getItem('fn_redeemed_codes'), JSON.stringify(['CODE1']));

    store.toggleRedeem('CODE1');
    assert.equal(store.isRedeemed('CODE1'), false);
    assert.equal(globalThis.localStorage.getItem('fn_redeemed_codes'), JSON.stringify([]));
});

test('CodesStore handles redeemAll and unredeemAll', () => {
    globalThis.localStorage = new MemoryStorage();
    const store = new CodesStore();
    const sampleCodes = [
        { code: 'A', active: true },
        { code: 'B', active: true },
        { code: 'C', active: false },
    ];

    store.redeemAll(sampleCodes);
    assert.equal(store.isRedeemed('A'), true);
    assert.equal(store.isRedeemed('B'), true);
    assert.equal(store.isRedeemed('C'), true);
    assert.equal(store.hasUnredeemed(sampleCodes), false);

    store.unredeemAll();
    assert.equal(store.isRedeemed('A'), false);
    assert.equal(store.isRedeemed('B'), false);
    assert.equal(store.hasUnredeemed(sampleCodes), true);
});

test('CodesStore detects unredeemed active codes', () => {
    globalThis.localStorage = new MemoryStorage({
        fn_redeemed_codes: JSON.stringify(['A']),
    });
    const sampleCodes = [
        { code: 'A', active: true },
        { code: 'B', active: true },
        { code: 'C', active: false },
    ];
    assert.equal(hasUnredeemedCodes(sampleCodes), true);

    globalThis.localStorage = new MemoryStorage({
        fn_redeemed_codes: JSON.stringify(['A', 'B']),
    });
    assert.equal(hasUnredeemedCodes(sampleCodes), false);
});

test('CodesStore resets all codes data and preferences', () => {
    globalThis.localStorage = new MemoryStorage({
        fn_redeemed_codes: JSON.stringify(['A', 'B']),
        fn_hide_redeemed_codes: 'true',
    });
    const store = new CodesStore();
    assert.equal(store.isRedeemed('A'), true);
    assert.equal(store.hideRedeemed, true);

    store.resetAll();
    assert.equal(store.isRedeemed('A'), false);
    assert.equal(store.hideRedeemed, false);
    assert.equal(globalThis.localStorage.getItem('fn_redeemed_codes'), null);
    assert.equal(globalThis.localStorage.getItem('fn_hide_redeemed_codes'), null);
});

