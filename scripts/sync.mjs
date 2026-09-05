import { execFileSync } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSourceCatalog, parseSourceCatalog, parseSourceCodes } from './read-source-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8192;

export function validatePngBuffer(buffer, filename = 'image') {
    if (!Buffer.isBuffer(buffer)) {
        buffer = Buffer.from(buffer);
    }
    if (buffer.length < 24) {
        throw new Error(`${filename} is truncated: only ${buffer.length} bytes.`);
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error(`${filename} exceeds maximum size of ${MAX_IMAGE_BYTES} bytes.`);
    }
    if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error(`${filename} does not have a valid PNG signature.`);
    }
    if (buffer.toString('ascii', 12, 16) !== 'IHDR') {
        throw new Error(`${filename} missing IHDR chunk header.`);
    }
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width <= 0 || height <= 0) {
        throw new Error(`${filename} has invalid dimensions (${width}x${height}).`);
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        throw new Error(`${filename} dimensions exceed limit of ${MAX_IMAGE_DIMENSION}px.`);
    }
    return { width, height, size: buffer.length };
}

export async function syncData({
    baseUrl = process.env.UPSTREAM_BASE_URL || 'https://rickventure.com',
    rootDir = root,
} = {}) {
    console.log(`\nSyncing sprites and codes data from ${baseUrl}...`);

    const dataDir = path.join(rootDir, 'src', 'data');
    const spritesOutputPath = path.join(dataDir, 'sprites.js');
    const codesOutputPath = path.join(dataDir, 'codes.js');
    const spritesDir = path.join(rootDir, 'sprites');

    await mkdir(dataDir, { recursive: true });

    // 1. Fetch and validate remote sprites-data.js
    console.log(`Fetching ${baseUrl}/sprites-data.js...`);
    const spritesRes = await fetch(`${baseUrl}/sprites-data.js`);
    if (!spritesRes.ok) {
        throw new Error(`Failed to fetch sprites-data.js: HTTP ${spritesRes.status} ${spritesRes.statusText}`);
    }
    const spritesSource = await spritesRes.text();
    const normalizedSprites = normalizeSourceCatalog(spritesSource);
    const sprites = parseSourceCatalog(normalizedSprites);
    if (!Array.isArray(sprites) || sprites.length === 0) {
        throw new Error('Fetched sprites data is empty or invalid.');
    }
    console.log(`Retrieved ${sprites.length} sprites from remote catalog.`);

    // 2. Fetch and validate remote codes-data.js
    console.log(`Fetching ${baseUrl}/codes-data.js...`);
    const codesRes = await fetch(`${baseUrl}/codes-data.js`);
    if (!codesRes.ok) {
        throw new Error(`Failed to fetch codes-data.js: HTTP ${codesRes.status} ${codesRes.statusText}`);
    }
    const codesSource = await codesRes.text();
    const normalizedCodes = normalizeSourceCatalog(codesSource);
    const codesData = parseSourceCodes(normalizedCodes);
    if (!Array.isArray(codesData.codes) || codesData.codes.length === 0) {
        throw new Error('Fetched codes data is empty or invalid.');
    }
    console.log(`Retrieved ${codesData.codes.length} codes across ${Object.keys(codesData.codeCategories).length} categories.`);

    // 3. Download any missing sprite PNG images
    const localEntries = await readdir(spritesDir);
    const localIds = new Set(
        localEntries
            .filter(file => file.toLowerCase().endsWith('.png'))
            .map(file => path.basename(file, path.extname(file))),
    );

    const missingSprites = sprites.filter(sprite => !localIds.has(sprite.id));
    let downloadedCount = 0;

    if (missingSprites.length > 0) {
        console.log(`Found ${missingSprites.length} missing sprite images to download.`);
        for (const sprite of missingSprites) {
            const imageUrl = `${baseUrl}/sprites/${sprite.id}.png`;
            console.log(`Downloading sprite: ${sprite.id}.png from ${imageUrl}...`);
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) {
                throw new Error(`Failed to download sprite image ${sprite.id}.png: HTTP ${imgRes.status} ${imgRes.statusText}`);
            }
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            validatePngBuffer(buffer, `${sprite.id}.png`);
            await writeFile(path.join(spritesDir, `${sprite.id}.png`), buffer);
            downloadedCount++;
        }
        console.log(`Successfully downloaded ${downloadedCount} new sprite images.`);
    } else {
        console.log('All sprite images are already present locally.');
    }

    // 4. Write directly to src/data/
    const spritesOutput = [
        '// Synchronized dataset. Do not edit by hand.',
        `export const sprites = ${JSON.stringify(sprites, null, 4)};`,
        '',
    ].join('\n');
    await writeFile(spritesOutputPath, spritesOutput, 'utf8');
    console.log(`Saved ${path.relative(rootDir, spritesOutputPath)} (${sprites.length} sprites).`);

    const codesOutput = [
        '// Synchronized dataset. Do not edit by hand.',
        `export const codes = ${JSON.stringify(codesData.codes, null, 4)};`,
        `export const codeCategories = ${JSON.stringify(codesData.codeCategories, null, 4)};`,
        `export const categoryOrder = ${JSON.stringify(codesData.categoryOrder, null, 4)};`,
        '',
    ].join('\n');
    await writeFile(codesOutputPath, codesOutput, 'utf8');
    console.log(`Saved ${path.relative(rootDir, codesOutputPath)} (${codesData.codes.length} codes).`);

    // 5. Run validation
    console.log('Running scripts/validate-catalog.mjs...');
    execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'validate-catalog.mjs')], {
        stdio: 'inherit',
    });

    console.log(`\nSync completed: ${sprites.length} sprites (${downloadedCount} new images), ${codesData.codes.length} codes.\n`);
    return {
        spritesCount: sprites.length,
        downloadedImagesCount: downloadedCount,
        codesCount: codesData.codes.length,
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncData().catch(err => {
        console.error('\nSync failed:', err.message);
        process.exit(1);
    });
}
