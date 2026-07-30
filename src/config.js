export const STORAGE_KEYS = Object.freeze({
    owned: 'fn_obtained_sprites',
    mastered: 'fn_mastered_sprites',
    search: 'fn_state_search',
    theme: 'fn_state_theme',
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
    'Cube',
    'Rift',
]);

export const RARITY_ORDER = Object.freeze([
    'Mythic',
    'Legendary',
    'Epic',
    'Rare',
    'Special',
]);

export const STATUS_FILTERS = Object.freeze(['all', 'owned', 'missing']);
export const GROUP_METHODS = Object.freeze(['sprite', 'theme', 'rarity', 'name']);
export const TRACKER_URL = 'https://cghxst.github.io/fnsprites/';

export const THEME_LABELS = Object.freeze({
    Basic: 'Base',
    Candy: 'Gummy',
});

export const EXPORT_THEME_LABELS = Object.freeze({
    Basic: 'BASE',
    Candy: 'GUMMY',
});

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
});

