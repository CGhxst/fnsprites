import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readSourceCatalog } from './read-source-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'sprites-data.js');
const spritesPath = path.join(root, 'sprites');
const sprites = await readSourceCatalog(dataPath);
const generatedPath = path.join(root, 'src', 'generated', 'sprites.js');
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
    ids.add(sprite.id);
}

const imageFiles = (await readdir(spritesPath))
    .filter(file => file.toLowerCase().endsWith('.png'));
const imageIds = new Set(imageFiles.map(file => path.basename(file, path.extname(file))));

const missingImages = [...ids].filter(id => !imageIds.has(id));
const orphanedImages = [...imageIds].filter(id => !ids.has(id));

assert.deepEqual(missingImages, [], `missing sprite images: ${missingImages.join(', ')}`);
if (orphanedImages.length) {
    console.warn(`Images awaiting data entries: ${orphanedImages.join(', ')}`);
}

console.log(`Catalog valid: ${sprites.length} entries and ${imageFiles.length} images.`);
