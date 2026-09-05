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

function createMinimalPng(width = 256, height = 256, marker = 0) {
    const buffer = Buffer.alloc(32);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
    buffer.writeUInt32BE(13, 8);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    buffer.writeUInt8(marker, 24);
    return buffer;
}

test('syncSpriteImages downloads new sprite and updates modified sprite', async () => {
    const { mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const { syncSpriteImages } = await import('../scripts/sync.mjs');

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sync-test-'));
    const originalFetch = globalThis.fetch;

    try {
        const initialPng = createMinimalPng(100, 100, 1);
        const updatedPng = createMinimalPng(100, 100, 2);
        const newPng = createMinimalPng(100, 100, 3);

        // Prepopulate existing sprite files
        await writeFile(path.join(tempDir, 'existing_modified.png'), initialPng);
        await writeFile(path.join(tempDir, 'existing_identical.png'), initialPng);

        // Mock fetch
        globalThis.fetch = async url => {
            if (url.endsWith('/existing_modified.png')) {
                return new Response(updatedPng, { status: 200 });
            }
            if (url.endsWith('/existing_identical.png')) {
                return new Response(initialPng, { status: 200 });
            }
            if (url.endsWith('/new_sprite.png')) {
                return new Response(newPng, { status: 200 });
            }
            return new Response('Not Found', { status: 404, statusText: 'Not Found' });
        };

        const sprites = [
            { id: 'existing_modified' },
            { id: 'existing_identical' },
            { id: 'new_sprite' },
        ];

        const result = await syncSpriteImages({
            sprites,
            spritesDir: tempDir,
            baseUrl: 'https://mock.test',
            concurrency: 2,
        });

        assert.equal(result.downloadedCount, 1);
        assert.equal(result.updatedCount, 1);
        assert.equal(result.unchangedCount, 1);

        const savedModified = await readFile(path.join(tempDir, 'existing_modified.png'));
        assert.ok(savedModified.equals(updatedPng));

        const savedNew = await readFile(path.join(tempDir, 'new_sprite.png'));
        assert.ok(savedNew.equals(newPng));
    } finally {
        globalThis.fetch = originalFetch;
        await rm(tempDir, { recursive: true, force: true });
    }
});

test('syncSpriteImages throws when a missing sprite fails to download', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const { syncSpriteImages } = await import('../scripts/sync.mjs');

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sync-fail-test-'));
    const originalFetch = globalThis.fetch;

    try {
        globalThis.fetch = async () => new Response('Server Error', { status: 500, statusText: 'Internal Error' });

        await assert.rejects(
            async () => {
                await syncSpriteImages({
                    sprites: [{ id: 'missing_sprite' }],
                    spritesDir: tempDir,
                    baseUrl: 'https://mock.test',
                });
            },
            /Failed to download missing sprite/i,
        );
    } finally {
        globalThis.fetch = originalFetch;
        await rm(tempDir, { recursive: true, force: true });
    }
});

test('syncSpriteImages preserves existing local copy when remote update fails', async () => {
    const { mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const { syncSpriteImages } = await import('../scripts/sync.mjs');

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'sync-warn-test-'));
    const originalFetch = globalThis.fetch;

    try {
        const existingPng = createMinimalPng(64, 64, 9);
        await writeFile(path.join(tempDir, 'preserved_sprite.png'), existingPng);

        globalThis.fetch = async () => new Response('Temporary outage', { status: 503, statusText: 'Service Unavailable' });

        const result = await syncSpriteImages({
            sprites: [{ id: 'preserved_sprite' }],
            spritesDir: tempDir,
            baseUrl: 'https://mock.test',
        });

        assert.equal(result.downloadedCount, 0);
        assert.equal(result.updatedCount, 0);

        const currentPng = await readFile(path.join(tempDir, 'preserved_sprite.png'));
        assert.ok(currentPng.equals(existingPng));
    } finally {
        globalThis.fetch = originalFetch;
        await rm(tempDir, { recursive: true, force: true });
    }
});

