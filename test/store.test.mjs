import test from 'node:test';
import assert from 'node:assert/strict';

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
}

globalThis.localStorage = new MemoryStorage();
const { TrackerStore } = await import('../src/store.js');

test('store enforces ownership and mastery invariants', () => {
    globalThis.localStorage = new MemoryStorage();
    const store = new TrackerStore(new Set(['air_basic', 'water_basic']));
    const changes = [];
    store.subscribe((_state, change) => changes.push(change));

    store.toggleMastered('air_basic');
    assert.equal(store.isMastered('air_basic'), false);

    store.toggleOwned('air_basic');
    store.toggleMastered('air_basic');
    assert.equal(store.isOwned('air_basic'), true);
    assert.equal(store.isMastered('air_basic'), true);

    store.toggleOwned('air_basic');
    assert.equal(store.isOwned('air_basic'), false);
    assert.equal(store.isMastered('air_basic'), false);
    assert.deepEqual(changes.map(change => change.field), ['owned', 'mastered', 'owned']);
});

test('store sanitizes restored data', () => {
    globalThis.localStorage = new MemoryStorage({
        fn_obtained_sprites: JSON.stringify(['air_basic', 'unknown', 'air_basic']),
        fn_mastered_sprites: JSON.stringify(['water_basic', 'air_basic']),
    });
    const store = new TrackerStore(new Set(['air_basic', 'water_basic']));
    assert.deepEqual([...store.state.owned], ['air_basic']);
    assert.deepEqual([...store.state.mastered], ['air_basic']);
});

test('store starts with defaults when browser storage is unavailable', () => {
    const warn = console.warn;
    console.warn = () => {};
    globalThis.localStorage = {
        getItem() {
            throw new DOMException('Blocked', 'SecurityError');
        },
        setItem() {
            throw new DOMException('Blocked', 'SecurityError');
        },
    };
    try {
        assert.doesNotThrow(() => new TrackerStore(new Set(['air_basic'])));
        const store = new TrackerStore(new Set(['air_basic']));
        assert.doesNotThrow(() => store.toggleOwned('air_basic'));
        assert.equal(store.isOwned('air_basic'), true);
    } finally {
        console.warn = warn;
    }
});
