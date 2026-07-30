import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup } from '../src/backup.js';

test('backup parser accepts current and legacy collection keys', () => {
    assert.deepEqual(parseBackup({ owned: ['air_basic'], mastered: [] }), {
        owned: ['air_basic'],
        mastered: [],
    });
    assert.deepEqual(parseBackup({ obtained: ['air_basic'], mastered: ['air_basic'] }), {
        owned: ['air_basic'],
        mastered: ['air_basic'],
    });
});

test('backup parser rejects malformed data and removes duplicate ids', () => {
    assert.throws(() => parseBackup({ owned: 'air_basic', mastered: [] }), /missing collection data/i);
    assert.throws(() => parseBackup({ owned: [42], mastered: [] }), /invalid sprite ids/i);
    assert.throws(() => parseBackup({ version: 99, owned: [], mastered: [] }), /unsupported backup version/i);
    assert.deepEqual(parseBackup({
        owned: ['air_basic', 'air_basic'],
        mastered: ['air_basic', 'air_basic'],
    }), {
        owned: ['air_basic'],
        mastered: ['air_basic'],
    });
});
