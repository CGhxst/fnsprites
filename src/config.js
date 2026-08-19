export const STORAGE_KEYS = Object.freeze({
    owned: 'fn_obtained_sprites',
    mastered: 'fn_mastered_sprites',
    search: 'fn_state_search',
    theme: 'fn_state_theme',
    season: 'fn_state_season',
    status: 'fn_state_status_filter',
    hideMastered: 'fn_state_hide_mastered',
    sort: 'fn_state_sort_order',
    showUnreleased: 'fn_state_unreleased',
    lowFidelity: 'fn_state_low_fidelity',
});

export const THEME_ORDER = Object.freeze([
    'Basic',
    'Gold',
    'Candy',
    'Galaxy',
    'Gem',
    'Holofoil',
    'Quack',
    'Cube',
    'Rift',
]);

export const SEASON_ORDER = Object.freeze([
    'Runners',
    'Override',
    'Unknown',
]);

export const RARITY_ORDER = Object.freeze([
    'Mythic',
    'Legendary',
    'Epic',
    'Rare',
    'Special',
]);

export const STATUS_FILTERS = Object.freeze(['all', 'owned', 'missing']);
export const GROUP_METHODS = Object.freeze(['sprite', 'theme', 'season', 'rarity', 'name']);
export const TRACKER_URL = 'https://cghxst.github.io/fnsprites/';

export const THEME_LABELS = Object.freeze({
    Basic: 'Base',
    Candy: 'Gummy',
});

export const EXPORT_THEME_LABELS = Object.freeze({
    Basic: 'BASE',
    Candy: 'GUMMY',
});

const palette = (top, bottom) => Object.freeze([top, bottom]);

const RARITY_PALETTES = Object.freeze({
    Rare: palette('#12659d', '#08233d'),
    Epic: palette('#71308d', '#271132'),
    Legendary: palette('#925728', '#3b2109'),
    Mythic: palette('#9d782c', '#3d2d09'),
});

const THEME_PALETTES = Object.freeze({
    Basic: palette('#344354', '#121920'),
    Gold: palette('#806523', '#292006'),
    Candy: palette('#a03d6c', '#351020'),
    Galaxy: palette('#493487', '#160d32'),
    Gem: palette('#238273', '#092b27'),
    Holofoil: palette('#43839a', '#102c38'),
    Quack: palette('#788f35', '#202a0d'),
    Cube: palette('#6434a3', '#210f3d'),
    Rift: palette('#246f82', '#092731'),
});

export function spritePalette(sprite) {
    if (sprite.rarity === 'Special') {
        return THEME_PALETTES[sprite.theme] || THEME_PALETTES.Basic;
    }
    return RARITY_PALETTES[sprite.rarity] || RARITY_PALETTES.Rare;
}

export const ICONS = Object.freeze({
    crown: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 18h18l-1.2-10-5 3.3L12 5l-2.8 6.3-5-3.3L3 18Zm1 2h16v2H4v-2Z"/>
        </svg>`,
    chevron: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5"/>
        </svg>`,
    download: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>
        </svg>`,
    share: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/>
        </svg>`,
    more: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/>
            <circle cx="19" cy="12" r="1.5"/>
        </svg>`,
    search: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
        </svg>`,
    trade: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
    code: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
});

