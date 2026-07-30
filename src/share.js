const LEGACY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const MAX_SHARE_CODE_LENGTH = 16_384;

function toBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > MAX_SHARE_CODE_LENGTH) {
        throw new TypeError('Invalid share code.');
    }
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

export function encodeShare(snapshot) {
    return toBase64Url(JSON.stringify({
        v: 2,
        o: snapshot.owned,
        m: snapshot.mastered,
    }));
}

export function decodeShare(code) {
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

function decodeLegacyBits(code) {
    let bits = '';
    for (const character of code) {
        const value = LEGACY_ALPHABET.indexOf(character);
        if (value === -1) return '';
        bits += value.toString(2).padStart(6, '0');
    }
    return bits;
}

export function decodeLegacyShare(code, sprites) {
    if (
        !code
        || code.length > MAX_SHARE_CODE_LENGTH
        || !/^[A-Za-z0-9\-_]*(?:~[A-Za-z0-9\-_]*)?$/.test(code)
    ) return null;
    const [ownedCode, masteredCode = ''] = code.split('~');
    const ownedBits = decodeLegacyBits(ownedCode);
    const masteredBits = decodeLegacyBits(masteredCode);
    const owned = [];
    const mastered = [];

    sprites.forEach((sprite, index) => {
        if (ownedBits[index] === '1') {
            owned.push(sprite.id);
            if (masteredBits[index] === '1') mastered.push(sprite.id);
        }
    });
    return { owned, mastered };
}
