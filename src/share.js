const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_SHARE_CODE_LENGTH = 16_384;

function spriteIds(sprites) {
    if (!Array.isArray(sprites)) throw new TypeError('A sprite catalog is required.');
    return sprites.map(sprite => typeof sprite === 'string' ? sprite : sprite.id);
}

function fromBase64Url(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > MAX_SHARE_CODE_LENGTH) {
        throw new TypeError('Invalid share code.');
    }
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}

export function decodeLegacyJsonShare(code) {
    try {
        const parsed = JSON.parse(fromBase64Url(code));
        if (
            parsed?.v !== 2
            || !Array.isArray(parsed.o)
            || !Array.isArray(parsed.m)
            || ![...parsed.o, ...parsed.m].every(id => typeof id === 'string')
        ) return null;
        return { owned: parsed.o, mastered: parsed.m };
    } catch {
        return null;
    }
}

export function encodeShare(snapshot, sprites, status = 'all') {
    const owned = new Set(snapshot.owned);
    const mastered = new Set(snapshot.mastered);
    let packed = BigInt(status === 'owned' ? 1 : status === 'missing' ? 2 : 0);
    let place = 3n;

    for (const id of spriteIds(sprites)) {
        const state = mastered.has(id) ? 2n : owned.has(id) ? 1n : 0n;
        packed += state * place;
        place *= 3n;
    }

    let payload = '';
    while (packed > 0n) {
        payload = ALPHABET[Number(packed % 64n)] + payload;
        packed /= 64n;
    }
    return payload;
}

export function decodeShare(code, sprites = []) {
    const ids = spriteIds(sprites);
    const maxPackedLength = Math.ceil((ids.length + 1) * Math.log(3) / Math.log(64));
    if (
        typeof code !== 'string'
        || code.length > maxPackedLength
        || !/^[A-Za-z0-9_-]*$/.test(code)
    ) return null;

    let packed = 0n;
    for (const character of code) {
        packed = packed * 64n + BigInt(ALPHABET.indexOf(character));
    }

    const status = ['all', 'owned', 'missing'][Number(packed % 3n)];
    packed /= 3n;

    const owned = [];
    const mastered = [];
    for (const id of ids) {
        const state = Number(packed % 3n);
        packed /= 3n;
        if (state > 0) owned.push(id);
        if (state === 2) mastered.push(id);
    }
    if (packed !== 0n) return null;
    return status === 'all' ? { owned, mastered } : { owned, mastered, status };
}

function decodeLegacyBits(code) {
    let bits = '';
    for (const character of code) {
        const value = ALPHABET.indexOf(character);
        if (value === -1) return null;
        bits += value.toString(2).padStart(6, '0');
    }
    return bits;
}

export function decodeLegacyShare(code, sprites) {
    if (
        typeof code !== 'string'
        || !code
        || code.length > MAX_SHARE_CODE_LENGTH
        || !/^[A-Za-z0-9_-]*(?:~[A-Za-z0-9_-]*)?$/.test(code)
        || !Array.isArray(sprites)
    ) return null;
    const [ownedCode, masteredCode = ''] = code.split('~');
    const ownedBits = decodeLegacyBits(ownedCode);
    const masteredBits = decodeLegacyBits(masteredCode);
    if (ownedBits === null || masteredBits === null) return null;

    const owned = [];
    const mastered = [];
    sprites.forEach((sprite, index) => {
        if (ownedBits[index] !== '1') return;
        owned.push(sprite.id);
        if (masteredBits[index] === '1') mastered.push(sprite.id);
    });
    return { owned, mastered };
}
