import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePngBuffer } from '../scripts/sync.mjs';

test('validatePngBuffer accepts valid PNG buffer', () => {
    // 24-byte minimal valid PNG header: 8 bytes signature + 4 bytes length + 4 bytes 'IHDR' + 4 bytes width + 4 bytes height
    const buffer = Buffer.alloc(32);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
    buffer.writeUInt32BE(13, 8); // IHDR length
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(256, 16); // width
    buffer.writeUInt32BE(256, 20); // height

    const result = validatePngBuffer(buffer, 'test.png');
    assert.equal(result.width, 256);
    assert.equal(result.height, 256);
    assert.equal(result.size, 32);
});

test('validatePngBuffer throws on truncated buffer', () => {
    const buffer = Buffer.alloc(10);
    assert.throws(() => validatePngBuffer(buffer, 'test.png'), /truncated/i);
});

test('validatePngBuffer throws on invalid signature', () => {
    const buffer = Buffer.alloc(32);
    buffer.write('NOT_A_PNG_FILE', 0);
    assert.throws(() => validatePngBuffer(buffer, 'test.png'), /valid PNG signature/i);
});

test('validatePngBuffer throws on missing IHDR', () => {
    const buffer = Buffer.alloc(32);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
    buffer.write('XXXX', 12, 'ascii');
    assert.throws(() => validatePngBuffer(buffer, 'test.png'), /missing IHDR/i);
});

test('validatePngBuffer throws on zero or negative dimensions', () => {
    const buffer = Buffer.alloc(32);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(0, 16); // 0 width
    buffer.writeUInt32BE(100, 20);
    assert.throws(() => validatePngBuffer(buffer, 'test.png'), /invalid dimensions/i);
});

test('validatePngBuffer throws on dimensions exceeding limit', () => {
    const buffer = Buffer.alloc(32);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(10000, 16); // exceeds 8192
    buffer.writeUInt32BE(100, 20);
    assert.throws(() => validatePngBuffer(buffer, 'test.png'), /dimensions exceed limit/i);
});
