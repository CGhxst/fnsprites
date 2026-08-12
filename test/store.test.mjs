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

    removeItem(key) {
        this.values.delete(key);
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

test('view-only interactions do not overwrite saved tracker preferences', () => {
    globalThis.localStorage = new MemoryStorage({
        fn_state_status_filter: 'owned',
        fn_state_sort_order: 'theme',
    });
    const store = new TrackerStore(new Set(['air_basic', 'water_basic']));
    store.replaceCollection(['air_basic'], [], { viewOnly: true });
    store.setFilter('status', 'missing');
    store.setSetting('group', 'rarity');
    store.toggleOwned('water_basic');

    assert.equal(store.state.filters.status, 'missing');
    assert.equal(store.state.settings.group, 'rarity');
    assert.equal(store.isOwned('water_basic'), false);
    assert.equal(globalThis.localStorage.getItem('fn_state_status_filter'), 'owned');
    assert.equal(globalThis.localStorage.getItem('fn_state_sort_order'), 'theme');
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

test('store manages season filter selection, select all, and clear', () => {
    globalThis.localStorage = new MemoryStorage();
    const store = new TrackerStore(new Set(['air_basic', 'water_basic']));

    assert.equal(store.isSeasonSelected('Runners'), true);

    store.toggleSeason('Override', false, ['Runners', 'Override']);
    assert.equal(store.isSeasonSelected('Runners'), true);
    assert.equal(store.isSeasonSelected('Override'), false);

    store.clearSeasons();
    assert.equal(store.isSeasonSelected('Runners'), false);
    assert.equal(store.isSeasonSelected('Override'), false);

    store.selectAllSeasons();
    assert.equal(store.isSeasonSelected('Runners'), true);
    assert.equal(store.isSeasonSelected('Override'), true);
});

test('store restores saved season selections across reloads', () => {
    const storage = new MemoryStorage({
        fn_state_season: JSON.stringify(['Runners']),
    });
    globalThis.localStorage = storage;
    const store = new TrackerStore(new Set(['air_basic']));

    assert.equal(store.isSeasonSelected('Runners'), true);
    assert.equal(store.isSeasonSelected('Override'), false);

    const emptyStorage = new MemoryStorage({
        fn_state_season: JSON.stringify([]),
    });
    globalThis.localStorage = emptyStorage;
    const clearedStore = new TrackerStore(new Set(['air_basic']));
    assert.equal(clearedStore.isSeasonSelected('Runners'), false);
    assert.equal(clearedStore.isSeasonSelected('Override'), false);
});

test('store resets all collection data, filters, settings, and storage', () => {
    globalThis.localStorage = new MemoryStorage();
    const store = new TrackerStore(new Set(['air_basic', 'water_basic']));
    store.toggleOwned('air_basic');
    store.toggleMastered('air_basic');
    store.setFilter('status', 'owned');
    store.setSetting('group', 'rarity');

    assert.equal(store.isOwned('air_basic'), true);
    assert.equal(store.isMastered('air_basic'), true);
    assert.equal(store.state.filters.status, 'owned');

    store.resetAll();

    assert.equal(store.isOwned('air_basic'), false);
    assert.equal(store.isMastered('air_basic'), false);
    assert.equal(store.state.filters.status, 'all');
    assert.equal(store.state.settings.group, 'season');
    assert.equal(globalThis.localStorage.getItem('fn_obtained_sprites'), null);
});
