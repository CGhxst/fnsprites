import { EXPORT_THEME_LABELS, RARITY_ORDER, THEME_LABELS, THEME_ORDER } from './config.js';

const REQUIRED_FIELDS = ['id', 'name', 'theme', 'rarity', 'unreleased'];

function orderedIndex(order, value) {
    const index = order.indexOf(value);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function familyKey(sprite) {
    const separator = sprite.id.lastIndexOf('_');
    return separator === -1 ? sprite.id : sprite.id.slice(0, separator);
}

export function createCatalog(rawSprites) {
    if (!Array.isArray(rawSprites)) {
        throw new TypeError('Sprite data must be an array.');
    }
    if (rawSprites.length === 0) {
        throw new TypeError('Sprite data must not be empty.');
    }

    const ids = new Set();
    const sprites = rawSprites.map((sprite, index) => {
        if (!sprite || typeof sprite !== 'object') {
            throw new TypeError(`Sprite at index ${index} is not an object.`);
        }

        for (const field of REQUIRED_FIELDS) {
            if (!(field in sprite)) {
                throw new TypeError(`Sprite at index ${index} is missing "${field}".`);
            }
        }

        if (!/^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(sprite.id)) {
            throw new TypeError(`Sprite id "${sprite.id}" is invalid.`);
        }
        if (ids.has(sprite.id)) {
            throw new TypeError(`Duplicate sprite id "${sprite.id}".`);
        }
        ids.add(sprite.id);

        return Object.freeze({
            id: sprite.id,
            name: String(sprite.name).trim(),
            theme: String(sprite.theme).trim(),
            rarity: String(sprite.rarity).trim(),
            unreleased: sprite.unreleased === true,
        });
    });

    const byId = new Map(sprites.map(sprite => [sprite.id, sprite]));
    const familyNames = new Map();
    for (const sprite of sprites) {
        const key = familyKey(sprite);
        if (sprite.theme === 'Basic' || !familyNames.has(key)) {
            familyNames.set(key, sprite.name.replace(/^(Gold|Gummy|Galaxy|Gem|Holofoil|Quack|Cube|Rift)\s+/i, ''));
        }
    }

    return Object.freeze({
        sprites: Object.freeze(sprites),
        ids,
        byId,
        released: Object.freeze(sprites.filter(sprite => !sprite.unreleased)),
        familyName(key) {
            return familyNames.get(key) || key.replace(/(^|[-_])\w/g, match => match.replace(/[-_]/, '').toUpperCase());
        },
    });
}

export function displayTheme(theme) {
    return THEME_LABELS[theme] || theme;
}

export function exportTheme(theme) {
    return EXPORT_THEME_LABELS[theme] || theme.toUpperCase();
}

export function activeThemes(sprites) {
    return [...new Set(sprites.map(sprite => sprite.theme))]
        .sort((a, b) => orderedIndex(THEME_ORDER, a) - orderedIndex(THEME_ORDER, b) || a.localeCompare(b));
}

export function familyMap(sprites) {
    const map = new Map();
    for (const sprite of sprites) {
        const key = familyKey(sprite);
        if (!map.has(key)) map.set(key, new Map());
        map.get(key).set(sprite.theme, sprite);
    }
    return map;
}

export function sortSprites(sprites, method) {
    return [...sprites].sort((a, b) => {
        if (method === 'theme') {
            return orderedIndex(THEME_ORDER, a.theme) - orderedIndex(THEME_ORDER, b.theme)
                || a.name.localeCompare(b.name);
        }
        if (method === 'rarity') {
            return orderedIndex(RARITY_ORDER, a.rarity) - orderedIndex(RARITY_ORDER, b.rarity)
                || a.name.localeCompare(b.name);
        }
        if (method === 'name') return a.name.localeCompare(b.name);

        const familyComparison = familyKey(a).localeCompare(familyKey(b));
        return familyComparison
            || orderedIndex(THEME_ORDER, a.theme) - orderedIndex(THEME_ORDER, b.theme);
    });
}

export function groupSprites(sprites, method, catalog) {
    if (method === 'name') {
        return sprites.length ? [{ key: 'all', label: 'All sprites', sprites }] : [];
    }

    const groups = new Map();
    for (const sprite of sprites) {
        let key = sprite.theme;
        let label = displayTheme(sprite.theme);

        if (method === 'sprite') {
            key = familyKey(sprite);
            label = catalog.familyName(key);
        } else if (method === 'rarity') {
            key = sprite.rarity;
            label = sprite.rarity;
        }

        if (!groups.has(key)) groups.set(key, { key, label, sprites: [] });
        groups.get(key).sprites.push(sprite);
    }
    return [...groups.values()];
}
