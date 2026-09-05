import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSourceCatalog, parseSourceCatalog, parseSourceCodes } from './read-source-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 8192;
const IMAGE_CONCURRENCY = 16;

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

export async function syncSpriteImages({
    sprites,
    spritesDir,
    baseUrl,
    concurrency = IMAGE_CONCURRENCY,
}) {
    let downloadedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    let index = 0;
    async function worker() {
        while (index < sprites.length) {
            const sprite = sprites[index++];
            const fileName = `${sprite.id}.png`;
            const filePath = path.join(spritesDir, fileName);
            const imageUrl = `${baseUrl}/sprites/${encodeURIComponent(sprite.id)}.png`;

            let localBuffer = null;
            try {
                localBuffer = await readFile(filePath);
            } catch (err) {
                if (err.code !== 'ENOENT') throw err;
            }

            let imgRes;
            try {
                imgRes = await fetch(imageUrl);
            } catch (err) {
                if (!localBuffer) {
                    throw new Error(`Failed to fetch missing sprite ${fileName}: ${err.message}`, { cause: err });
                }
                console.warn(`Warning: Network error fetching ${fileName}, keeping local copy: ${err.message}`);
                continue;
            }

            if (!imgRes.ok) {
                if (!localBuffer) {
                    throw new Error(`Failed to download missing sprite ${fileName}: HTTP ${imgRes.status} ${imgRes.statusText}`);
                }
                console.warn(`Warning: Remote returned HTTP ${imgRes.status} for existing sprite ${fileName}, keeping local copy.`);
                continue;
            }

            const remoteBuffer = Buffer.from(await imgRes.arrayBuffer());
            if (!localBuffer) {
                validatePngBuffer(remoteBuffer, fileName);
                await writeFile(filePath, remoteBuffer);
                downloadedCount++;
            } else if (!localBuffer.equals(remoteBuffer)) {
                validatePngBuffer(remoteBuffer, fileName);
                await writeFile(filePath, remoteBuffer);
                updatedCount++;
                console.log(`Updated sprite image: ${fileName}`);
            } else {
                unchangedCount++;
            }
        }
    }

    const workerCount = Math.min(concurrency, Math.max(sprites.length, 1));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return { downloadedCount, updatedCount, unchangedCount };
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

    // 3. Download missing sprite PNG images and update any modified images
    console.log(`Checking and syncing ${sprites.length} sprite images from ${baseUrl}...`);
    const { downloadedCount, updatedCount, unchangedCount } = await syncSpriteImages({
        sprites,
        spritesDir,
        baseUrl,
    });
    console.log(
        `Sprite images synced: ${downloadedCount} new, ${updatedCount} updated, ${unchangedCount} unchanged.`
    );

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

    console.log(
        `\nSync completed: ${sprites.length} sprites (${downloadedCount} new images, ${updatedCount} updated images), ${codesData.codes.length} codes.\n`
    );
    return {
        spritesCount: sprites.length,
        downloadedImagesCount: downloadedCount,
        updatedImagesCount: updatedCount,
        codesCount: codesData.codes.length,
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    syncData().catch(err => {
        console.error('\nSync failed:', err.message);
        process.exit(1);
    });
}
