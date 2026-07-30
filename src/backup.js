export function parseBackup(value) {
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
