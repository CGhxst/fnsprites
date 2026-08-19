import assert from 'node:assert/strict';
import { open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readSourceCatalog, readSourceCodes } from './read-source-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const maxImageDimension = 8192;
const maxImageBytes = 8 * 1024 * 1024;
const dataPath = path.join(root, 'sprites-data.js');
const codesDataPath = path.join(root, 'codes-data.js');
const spritesPath = path.join(root, 'sprites');
const sprites = await readSourceCatalog(dataPath);
const generatedPath = path.join(root, 'src', 'generated', 'sprites.js');
const generatedCodesPath = path.join(root, 'src', 'generated', 'codes.js');
const generated = await import(`${pathToFileURL(generatedPath).href}?validation=${Date.now()}`);
assert.ok(Array.isArray(sprites), 'sprites-data.js must define baseSprites as an array');
assert.ok(sprites.length > 0, 'baseSprites must not be empty');
assert.deepEqual(generated.sprites, sprites, 'generated sprite module is out of date; run npm run build:data');

const ids = new Set();
for (const [index, sprite] of sprites.entries()) {
    assert.equal(typeof sprite, 'object', `sprite ${index} must be an object`);
    assert.match(sprite.id, /^[a-z0-9]+(?:_[a-z0-9]+)+$/, `invalid id: ${sprite.id}`);
    assert.ok(!ids.has(sprite.id), `duplicate id: ${sprite.id}`);
    assert.ok(typeof sprite.name === 'string' && sprite.name.trim(), `missing name: ${sprite.id}`);
    assert.ok(typeof sprite.theme === 'string' && sprite.theme.trim(), `missing theme: ${sprite.id}`);
    assert.ok(typeof sprite.rarity === 'string' && sprite.rarity.trim(), `missing rarity: ${sprite.id}`);
    assert.equal(typeof sprite.unreleased, 'boolean', `unreleased must be boolean: ${sprite.id}`);
    assert.ok(typeof sprite.season === 'string' && sprite.season.trim(), `missing season: ${sprite.id}`);
    ids.add(sprite.id);
}

const spriteEntries = await readdir(spritesPath, { withFileTypes: true });
const unexpectedEntries = spriteEntries
    .filter(entry => !entry.isFile() || !entry.name.toLowerCase().endsWith('.png'))
    .map(entry => entry.name);
assert.deepEqual(unexpectedEntries, [], `unsupported entries in sprites/: ${unexpectedEntries.join(', ')}`);

const imageFiles = spriteEntries.map(entry => entry.name);
const imageIds = new Set(imageFiles.map(file => path.basename(file, path.extname(file))));
assert.equal(imageIds.size, imageFiles.length, 'sprite image ids must be unique');

for (const file of imageFiles) {
    const imagePath = path.join(spritesPath, file);
    const fileInfo = await stat(imagePath);
    assert.ok(fileInfo.size <= maxImageBytes, `sprite image exceeds ${maxImageBytes} bytes: ${file}`);
    const header = Buffer.alloc(24);
    const handle = await open(imagePath, 'r');
    let bytesRead;
    try {
        ({ bytesRead } = await handle.read(header, 0, header.length, 0));
    } finally {
        await handle.close();
    }
    assert.equal(bytesRead, header.length, `sprite image is truncated: ${file}`);
    assert.ok(header.subarray(0, pngSignature.length).equals(pngSignature), `sprite image is not a PNG: ${file}`);
    assert.equal(header.toString('ascii', 12, 16), 'IHDR', `sprite image has no IHDR header: ${file}`);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    assert.ok(width > 0 && height > 0, `sprite image has invalid dimensions: ${file}`);
    assert.ok(
        width <= maxImageDimension && height <= maxImageDimension,
        `sprite image exceeds ${maxImageDimension}px: ${file}`,
    );
}

const missingImages = [...ids].filter(id => !imageIds.has(id));
const orphanedImages = [...imageIds].filter(id => !ids.has(id));

assert.deepEqual(missingImages, [], `missing sprite images: ${missingImages.join(', ')}`);
if (orphanedImages.length) {
    console.warn(`Images awaiting data entries: ${orphanedImages.join(', ')}`);
}

console.log(`Catalog valid: ${sprites.length} entries and ${imageFiles.length} images.`);

try {
    const codes = await readSourceCodes(codesDataPath);
    const generatedCodes = await import(`${pathToFileURL(generatedCodesPath).href}?validation=${Date.now()}`);
    assert.ok(Array.isArray(codes), 'codes-data.js must define baseCodes as an array');
    assert.deepEqual(generatedCodes.codes, codes, 'generated codes module is out of date; run npm run build:data');

    const codeSet = new Set();
    for (const [index, item] of codes.entries()) {
        assert.equal(typeof item, 'object', `code ${index} must be an object`);
        assert.ok(typeof item.code === 'string' && item.code.trim(), `missing code string: index ${index}`);
        assert.ok(!codeSet.has(item.code), `duplicate code: ${item.code}`);
        assert.ok(typeof item.reward === 'string', `missing reward: ${item.code}`);
        assert.ok(typeof item.source === 'string', `missing source: ${item.code}`);
        assert.equal(typeof item.active, 'boolean', `active must be boolean: ${item.code}`);
        codeSet.add(item.code);
    }
    console.log(`Codes valid: ${codes.length} entries.`);
} catch (error) {
    if (error.code !== 'ENOENT') throw error;
}

