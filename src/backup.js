import { decodeLegacyJsonShare, decodeLegacyShare, decodeShare } from './share.js';

export function parseBackup(value, sprites = []) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                return parseBackup(JSON.parse(trimmed), sprites);
            } catch {
                throw new TypeError('Invalid JSON backup content.');
            }
        }
        let code = trimmed;
        try {
            if (trimmed.includes('://') || trimmed.includes('?')) {
                const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
                code = url.searchParams.get('s') || url.searchParams.get('share') || url.searchParams.get('c') || trimmed;
            }
        } catch {
            // Keep raw string
        }

        const decoded = decodeShare(code, sprites)
            || decodeLegacyJsonShare(code)
            || decodeLegacyShare(code, sprites);
        if (decoded) {
            return {
                owned: [...new Set(decoded.owned || [])],
                mastered: [...new Set(decoded.mastered || [])],
            };
        }
        throw new TypeError('Invalid backup code or format.');
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Backup must be an object.');
    }
    if (value.version !== undefined && value.version !== 2) {
        throw new TypeError(`Unsupported backup version: ${value.version}`);
    }

    const owned = Array.isArray(value.owned) ? value.owned : value.obtained;
    if (!Array.isArray(owned) || !Array.isArray(value.mastered)) {
        throw new TypeError('Backup is missing collection data.');
    }
    if (![...owned, ...value.mastered].every(id => typeof id === 'string')) {
        throw new TypeError('Backup contains invalid sprite ids.');
    }

    return {
        owned: [...new Set(owned)],
        mastered: [...new Set(value.mastered)],
    };
}
