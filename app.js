import { createCatalog, activeThemes, displayTheme, groupSprites, sortSprites } from './src/catalog.js';
import { parseBackup } from './src/backup.js';
import { GROUP_METHODS, ICONS, STATUS_FILTERS, spritePalette } from './src/config.js';
import { downloadBackup, exportBoard, tradeGrid } from './src/export-board.js';
import { decodeLegacyShare, decodeShare, encodeShare } from './src/share.js';
import { TrackerStore } from './src/store.js';
import { sprites as rawSprites } from './src/generated/sprites.js';

let catalog;
let store;

const dom = {
    sharedBanner: document.querySelector('#sharedBanner'),
    collectionRatio: document.querySelector('#collectionRatio'),
    collectionFill: document.querySelector('#collectionFill'),
    masteryRatio: document.querySelector('#masteryRatio'),
    masteryFill: document.querySelector('#masteryFill'),
    searchInput: document.querySelector('#searchInput'),
    themeFilter: document.querySelector('#themeFilter'),
    groupOrder: document.querySelector('#groupOrder'),
    statusTabs: document.querySelector('#statusTabs'),
    hideMastered: document.querySelector('#hideMastered'),
    showUnreleased: document.querySelector('#showUnreleased'),
    lowFidelity: document.querySelector('#lowFidelity'),
    exportMenu: document.querySelector('#exportMenu'),
    exportToggle: document.querySelector('#exportToggle'),
    shareButton: document.querySelector('#shareButton'),
    moreMenu: document.querySelector('#moreMenu'),
    moreToggle: document.querySelector('#moreToggle'),
    copyGridButton: document.querySelector('#copyGridButton'),
    backupButton: document.querySelector('#backupButton'),
    importButton: document.querySelector('#importButton'),
    importInput: document.querySelector('#importInput'),
    collectionTitle: document.querySelector('#collectionTitle'),
    resultCount: document.querySelector('#resultCount'),
    spriteGroups: document.querySelector('#spriteGroups'),
    emptyState: document.querySelector('#emptyState'),
    toastRegion: document.querySelector('#toastRegion'),
};

function installIcons() {
    const icons = {
        searchIcon: ICONS.search,
        exportIcon: ICONS.download,
        exportChevron: ICONS.chevron,
        shareIcon: ICONS.share,
        moreIcon: ICONS.more,
    };
    for (const [id, svg] of Object.entries(icons)) {
        const element = document.getElementById(id);
        if (element) element.innerHTML = svg;
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    })[character]);
}

function toast(message, type = 'info') {
    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    element.textContent = message;
    dom.toastRegion.replaceChildren(element);
    requestAnimationFrame(() => element.classList.add('is-visible'));
    setTimeout(() => {
        element.classList.remove('is-visible');
        element.addEventListener('transitionend', () => element.remove(), { once: true });
    }, 2600);
}

function counts() {
    return {
        total: catalog.released.length,
        owned: catalog.released.filter(sprite => store.isOwned(sprite.id)).length,
        mastered: catalog.released.filter(sprite => store.isMastered(sprite.id)).length,
    };
}

function filteredSprites() {
    return catalog.sprites.filter(spriteMatchesFilters);
}

function spriteMatchesFilters(sprite) {
    const { filters, settings } = store.state;
    const search = filters.search.trim().toLocaleLowerCase();
    if (!settings.showUnreleased && sprite.unreleased) return false;
    if (settings.hideMastered && store.isMastered(sprite.id)) return false;
    if (store.viewOnly && (!store.isOwned(sprite.id) || sprite.unreleased)) return false;
    if (filters.theme !== 'all' && sprite.theme !== filters.theme) return false;
    if (search && !`${sprite.name} ${sprite.theme} ${sprite.rarity}`.toLocaleLowerCase().includes(search)) return false;
    if (!store.viewOnly && filters.status === 'owned' && !store.isOwned(sprite.id)) return false;
    if (!store.viewOnly && filters.status === 'missing' && store.isOwned(sprite.id)) return false;
    return true;
}

function cardMarkup(sprite) {
    const owned = store.isOwned(sprite.id);
    const mastered = store.isMastered(sprite.id);
    const safeName = escapeHtml(sprite.name);
    const [cardTop, cardBottom] = spritePalette(sprite);
    const classes = [
        'sprite-card',
        sprite.rarity === 'Special' ? 'is-special-rarity' : '',
        owned ? 'is-owned' : 'is-missing',
        mastered ? 'is-mastered' : '',
        sprite.unreleased ? 'is-unreleased' : '',
    ].filter(Boolean).join(' ');
    const stateLabel = sprite.unreleased ? 'Unreleased' : mastered ? 'Mastered' : owned ? 'Owned' : 'Missing';
    const masteryButton = owned && !store.viewOnly
        ? `<button type="button" class="mastery-button" aria-label="${mastered ? 'Remove mastery from' : 'Mark'} ${safeName}${mastered ? '' : ' as mastered'}" title="${mastered ? 'Remove mastery' : 'Mark as mastered'}">${ICONS.crown}</button>`
        : '';
    const art = store.viewOnly
        ? `<div class="sprite-art" role="img" aria-label="${safeName}: ${stateLabel}">
                <span class="card-state">${stateLabel}</span>
                <img src="sprites/${encodeURIComponent(sprite.id)}.png" alt="" loading="lazy" decoding="async">
                <span class="rarity-tag">${escapeHtml(sprite.rarity)}</span>
            </div>`
        : `<button type="button" class="sprite-art" aria-pressed="${owned}"
                aria-label="${owned ? 'Remove' : 'Add'} ${safeName} ${owned ? 'from' : 'to'} collection">
                <span class="card-state">${stateLabel}</span>
                <img src="sprites/${encodeURIComponent(sprite.id)}.png" alt="" loading="lazy" decoding="async">
                <span class="rarity-tag">${escapeHtml(sprite.rarity)}</span>
            </button>`;

    return `
        <article class="${classes}" data-id="${escapeHtml(sprite.id)}"
                style="--card-top: ${cardTop}; --card-bottom: ${cardBottom}">
            ${art}
            ${masteryButton}
            <div class="sprite-name">
                <strong>${safeName}</strong>
                <span>${escapeHtml(displayTheme(sprite.theme))}</span>
            </div>
        </article>`;
}

function renderProgress() {
    const { total, owned, mastered } = counts();
    dom.collectionRatio.textContent = `${owned} / ${total}`;
    dom.masteryRatio.textContent = `${mastered} / ${total}`;
    dom.collectionFill.style.width = `${total ? (owned / total) * 100 : 0}%`;
    dom.masteryFill.style.width = `${total ? (mastered / total) * 100 : 0}%`;
}

function renderControls() {
    const { filters, settings } = store.state;
    dom.searchInput.value = filters.search;
    dom.themeFilter.value = filters.theme;
    dom.groupOrder.value = settings.group;
    dom.hideMastered.checked = settings.hideMastered;
    dom.showUnreleased.checked = settings.showUnreleased;
    dom.lowFidelity.checked = settings.lowFidelity;
    document.body.classList.toggle('low-fidelity', settings.lowFidelity);

    dom.statusTabs.querySelectorAll('button').forEach(button => {
        const active = button.dataset.status === filters.status;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        button.disabled = store.viewOnly;
    });
}

function renderCollection() {
    const sorted = sortSprites(filteredSprites(), store.state.settings.group);
    const groups = groupSprites(sorted, store.state.settings.group, catalog);
    const showGroupLabels = store.state.settings.group !== 'name';

    dom.collectionTitle.textContent = store.viewOnly
        ? 'Shared collection'
        : store.state.filters.status === 'owned'
            ? 'Owned sprites'
            : store.state.filters.status === 'missing'
                ? 'Missing sprites'
                : 'All sprites';
    dom.resultCount.textContent = `${sorted.length} shown`;
    dom.emptyState.hidden = sorted.length !== 0;

    dom.spriteGroups.innerHTML = groups.map((group, index) => `
        <section class="sprite-group" ${showGroupLabels
            ? `aria-labelledby="sprite-group-${index}"`
            : `aria-label="${escapeHtml(group.label)}"`}>
            ${showGroupLabels ? `
                <div class="group-heading">
                    <h2 id="sprite-group-${index}">${escapeHtml(group.label)}</h2>
                    <span>${group.sprites.length}</span>
                </div>` : ''}
            <div class="sprite-grid">
                ${group.sprites.map(cardMarkup).join('')}
            </div>
        </section>
    `).join('');
}

function render() {
    renderProgress();
    renderControls();
    renderCollection();
}

function patchCollectionCard(change) {
    if (change.type !== 'collection') return false;
    const sprite = catalog.byId.get(change.id);
    const current = dom.spriteGroups.querySelector(`[data-id="${change.id}"]`);
    if (!sprite || !current || !spriteMatchesFilters(sprite)) return false;

    const activeControl = current.contains(document.activeElement)
        ? document.activeElement.classList.contains('mastery-button')
            ? 'mastery'
            : 'owned'
        : null;
    const template = document.createElement('template');
    template.innerHTML = cardMarkup(sprite).trim();
    const replacement = template.content.firstElementChild;
    current.replaceWith(replacement);

    if (activeControl === 'mastery') replacement.querySelector('.mastery-button')?.focus();
    if (activeControl === 'owned') replacement.querySelector('.sprite-art')?.focus();
    return true;
}

function handleStoreChange(_state, change) {
    renderProgress();
    if (patchCollectionCard(change)) return;
    renderControls();
    renderCollection();
}

function populateThemes() {
    const current = store.state.filters.theme;
    dom.themeFilter.replaceChildren(
        new Option('All themes', 'all'),
        ...activeThemes(catalog.sprites).map(theme => new Option(displayTheme(theme), theme)),
    );
    if (![...dom.themeFilter.options].some(option => option.value === current)) {
        store.state.filters.theme = 'all';
    }
}

function closeMenus({ except = null, restoreFocus = false } = {}) {
    for (const [menu, toggle] of [
        [dom.exportMenu, dom.exportToggle],
        [dom.moreMenu, dom.moreToggle],
    ]) {
        if (menu === except) continue;
        const wasOpen = menu.classList.contains('is-open');
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        if (restoreFocus && wasOpen) toggle.focus();
    }
}

function toggleMenu(menu, toggle) {
    const willOpen = !menu.classList.contains('is-open');
    closeMenus({ except: menu });
    menu.classList.toggle('is-open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) menu.querySelector('.menu-popover button, .menu-popover input')?.focus();
    else toggle.focus();
}

async function copyText(text, successMessage) {
    let textarea;
    try {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                toast(successMessage, 'success');
                return;
            } catch {
                // Fall through to the browser's legacy copy path.
            }
        }

        textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        if (!document.execCommand('copy')) throw new Error('Copy command failed.');
        toast(successMessage, 'success');
    } catch (error) {
        console.error(error);
        toast('Could not copy to the clipboard.', 'error');
    } finally {
        textarea?.remove();
    }
}

function bindCollectionEvents() {
    dom.spriteGroups.addEventListener('click', event => {
        if (store.viewOnly) return;
        const card = event.target.closest('.sprite-card');
        if (!card) return;
        if (event.target.closest('.mastery-button')) store.toggleMastered(card.dataset.id);
        else if (event.target.closest('.sprite-art')) store.toggleOwned(card.dataset.id);
    });

    dom.spriteGroups.addEventListener('error', event => {
        if (event.target instanceof HTMLImageElement) {
            event.target.closest('.sprite-card')?.classList.add('image-missing');
        }
    }, true);
}

function bindControlEvents() {
    let searchTimer;
    dom.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const value = dom.searchInput.value;
        searchTimer = setTimeout(() => store.setFilter('search', value), 80);
    });
    dom.themeFilter.addEventListener('change', () => store.setFilter('theme', dom.themeFilter.value));
    dom.groupOrder.addEventListener('change', () => {
        if (GROUP_METHODS.includes(dom.groupOrder.value)) store.setSetting('group', dom.groupOrder.value);
    });
    dom.statusTabs.addEventListener('click', event => {
        const button = event.target.closest('[data-status]');
        if (button && STATUS_FILTERS.includes(button.dataset.status)) {
            store.setFilter('status', button.dataset.status);
        }
    });
    dom.hideMastered.addEventListener('change', () => store.setSetting('hideMastered', dom.hideMastered.checked));
    dom.showUnreleased.addEventListener('change', () => store.setSetting('showUnreleased', dom.showUnreleased.checked));
    dom.lowFidelity.addEventListener('change', () => store.setSetting('lowFidelity', dom.lowFidelity.checked));

    dom.exportToggle.addEventListener('click', event => {
        event.stopPropagation();
        toggleMenu(dom.exportMenu, dom.exportToggle);
    });
    dom.moreToggle.addEventListener('click', event => {
        event.stopPropagation();
        toggleMenu(dom.moreMenu, dom.moreToggle);
    });
    dom.exportMenu.addEventListener('click', event => {
        const button = event.target.closest('[data-export]');
        if (!button) return;
        closeMenus({ restoreFocus: true });
        exportBoard(button.dataset.export, catalog, store, toast).catch(error => {
            console.error(error);
            toast('Could not create that image.', 'error');
        });
    });

    dom.shareButton.addEventListener('click', () => {
        const code = encodeShare(store.snapshot());
        const url = new URL(location.href);
        url.search = '';
        url.searchParams.set('share', code);
        copyText(url.toString(), 'Share link copied.');
    });
    dom.copyGridButton.addEventListener('click', () => {
        closeMenus({ restoreFocus: true });
        copyText(tradeGrid(catalog, store), 'Trade grid copied.');
    });
    dom.backupButton.addEventListener('click', () => {
        closeMenus({ restoreFocus: true });
        downloadBackup(store);
        toast('Backup downloaded.', 'success');
    });
    dom.importButton.addEventListener('click', () => {
        closeMenus({ restoreFocus: true });
        if (store.viewOnly) {
            toast('Open your tracker before importing.', 'error');
            return;
        }
        dom.importInput.click();
    });
    dom.importInput.addEventListener('change', async () => {
        const [file] = dom.importInput.files;
        if (!file) return;
        try {
            if (file.size > 1_000_000) throw new TypeError('Backup file is too large.');
            const data = parseBackup(JSON.parse(await file.text()));
            store.replaceCollection(data.owned, data.mastered);
            toast('Collection imported.', 'success');
        } catch {
            toast('That backup file is not valid.', 'error');
        } finally {
            dom.importInput.value = '';
        }
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.menu')) closeMenus();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenus({ restoreFocus: true });
        if (event.key === '/' && !event.target.matches('input, select, textarea')) {
            event.preventDefault();
            dom.searchInput.focus();
        }
    });
}

function readSharedCollection() {
    const params = new URLSearchParams(location.search);
    const hasCurrent = params.has('share');
    const hasLegacy = params.has('c');
    const current = params.get('share');
    const legacy = params.get('c');
    const shared = hasCurrent
        ? decodeShare(current)
        : hasLegacy
            ? decodeLegacyShare(legacy, catalog.sprites)
            : null;
    if (!shared) {
        if (hasCurrent || hasLegacy) {
            dom.sharedBanner.hidden = false;
            dom.sharedBanner.classList.add('is-error');
            dom.sharedBanner.querySelector('span').textContent = 'This shared collection link is invalid.';
        }
        return;
    }

    store.replaceCollection(shared.owned, shared.mastered, { viewOnly: true });
    store.state.filters = { search: '', theme: 'all', status: 'all' };
    store.state.settings.hideMastered = false;
    store.state.settings.showUnreleased = false;
    dom.sharedBanner.hidden = false;
    dom.shareButton.hidden = true;
    dom.moreMenu.hidden = true;
}

function showStartupError(error) {
    console.error('Unable to start Sprites Tracker.', error);
    const shell = document.querySelector('.app-shell') || document.body;
    shell.replaceChildren();
    const message = document.createElement('main');
    message.className = 'fatal-state';
    message.innerHTML = `
        <strong>Unable to load the sprite catalog</strong>
        <span>Refresh the page or try again later.</span>`;
    shell.appendChild(message);
}

function start() {
    try {
        catalog = createCatalog(rawSprites);
        store = new TrackerStore(catalog.ids);
        installIcons();
        populateThemes();
        readSharedCollection();
        store.subscribe(handleStoreChange);
        bindCollectionEvents();
        bindControlEvents();
        render();
    } catch (error) {
        showStartupError(error);
    }
}

start();
