import { createCatalog, activeThemes, displayTheme, groupSprites, sortSprites } from './src/catalog.js';
import { parseBackup } from './src/backup.js';
import { compareCollections } from './src/compare.js';
import { GROUP_METHODS, ICONS, STATUS_FILTERS, spritePalette } from './src/config.js';
import { downloadBackup, exportBoard, tradeGrid } from './src/export-board.js';
import { decodeLegacyJsonShare, decodeLegacyShare, decodeShare, encodeShare } from './src/share.js';
import { TrackerStore } from './src/store.js';
import { sprites as rawSprites } from './src/generated/sprites.js';

let catalog;
let store;
let comparison;

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
    quickFilters: document.querySelector('#quickFilters'),
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
    emptyTitle: document.querySelector('#emptyTitle'),
    emptyMessage: document.querySelector('#emptyMessage'),
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
    if (filters.theme !== 'all' && sprite.theme !== filters.theme) return false;
    if (search && !`${sprite.name} ${sprite.theme} ${sprite.rarity}`.toLocaleLowerCase().includes(search)) return false;
    if (filters.status === 'owned' && !store.isOwned(sprite.id)) return false;
    if (filters.status === 'missing' && store.isOwned(sprite.id)) return false;
    if (comparison?.active && !comparison.theirs.has(sprite.id) && !comparison.yours.has(sprite.id)) return false;
    return true;
}

function cardMarkup(sprite) {
    const tradeSide = comparison?.active
        ? comparison.theirs.has(sprite.id) ? 'theirs' : comparison.yours.has(sprite.id) ? 'yours' : null
        : null;
    const comparing = Boolean(tradeSide);
    const owned = comparing || store.isOwned(sprite.id);
    const mastered = !comparing && store.isMastered(sprite.id);
    const safeName = escapeHtml(sprite.name);
    const [cardTop, cardBottom] = spritePalette(sprite);
    const classes = [
        'sprite-card',
        sprite.rarity === 'Special' ? 'is-special-rarity' : '',
        owned ? 'is-owned' : 'is-missing',
        mastered ? 'is-mastered' : '',
        tradeSide ? `trade-${tradeSide}` : '',
        sprite.unreleased ? 'is-unreleased' : '',
    ].filter(Boolean).join(' ');
    const stateLabel = comparing
        ? tradeSide === 'theirs' ? 'They offer' : 'You offer'
        : sprite.unreleased ? 'Unreleased' : mastered ? 'Mastered' : owned ? 'Owned' : 'Missing';
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
    });

    const comparing = Boolean(comparison?.active);
    dom.statusTabs.hidden = comparing;
    dom.quickFilters.hidden = comparing;

    const compareButton = document.querySelector('#compareButton');
    if (compareButton) {
        compareButton.textContent = comparing ? 'Hide trade matches' : 'Compare trades';
        compareButton.setAttribute('aria-pressed', String(comparing));
    }
}

function groupMarkup(sprites, idPrefix) {
    const groups = groupSprites(sprites, store.state.settings.group, catalog);
    const showGroupLabels = store.state.settings.group !== 'name';

    return groups.map((group, index) => `
        <section class="sprite-group" ${showGroupLabels
            ? `aria-labelledby="${idPrefix}-group-${index}"`
            : `aria-label="${escapeHtml(group.label)}"`}>
            ${showGroupLabels ? `
                <div class="group-heading">
                    <h2 id="${idPrefix}-group-${index}">${escapeHtml(group.label)}</h2>
                    <span>${group.sprites.length}</span>
                </div>` : ''}
            <div class="sprite-grid">
                ${group.sprites.map(cardMarkup).join('')}
            </div>
        </section>
    `).join('');
}

function comparisonMarkup(sorted) {
    return `<div class="trade-columns">
        ${[
            ['theirs', 'They can offer', comparison.theirs],
            ['yours', 'You can offer', comparison.yours],
        ].map(([side, title, ids]) => {
            const sprites = sorted.filter(sprite => ids.has(sprite.id));
            return `<section class="trade-pane is-${side}" aria-labelledby="trade-${side}-title">
                <div class="trade-pane-heading">
                    <h2 id="trade-${side}-title">${title}</h2>
                    <strong>${sprites.length}</strong>
                </div>
                ${sprites.length
                    ? groupMarkup(sprites, `trade-${side}`)
                    : '<p class="trade-pane-empty">No matches on this side.</p>'}
            </section>`;
        }).join('')}
    </div>`;
}

function renderCollection() {
    const sorted = sortSprites(filteredSprites(), store.state.settings.group);

    dom.collectionTitle.textContent = comparison?.active
        ? 'Trade matches'
        : store.viewOnly
        ? store.state.filters.status === 'owned'
            ? 'Sprites they have'
            : store.state.filters.status === 'missing'
                ? 'Sprites they need'
                : 'Shared collection'
        : store.state.filters.status === 'owned'
            ? 'Owned sprites'
            : store.state.filters.status === 'missing'
                ? 'Missing sprites'
                : 'All sprites';
    dom.resultCount.textContent = `${sorted.length} shown`;
    dom.emptyState.hidden = sorted.length !== 0;
    dom.emptyTitle.textContent = comparison?.active ? 'No trade matches' : 'No sprites found';
    dom.emptyMessage.textContent = comparison?.active
        ? 'Neither locker has a sprite the other one is missing.'
        : 'Try a different search or filter.';

    dom.spriteGroups.innerHTML = comparison?.active
        ? comparisonMarkup(sorted)
        : groupMarkup(sorted, 'sprite');
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
        const code = encodeShare(store.snapshot(), catalog.sprites, store.state.filters.status);
        const url = new URL(location.href);
        url.search = '';
        url.searchParams.set('s', code);
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

    dom.sharedBanner.addEventListener('click', event => {
        if (!event.target.closest('#compareButton') || !comparison) return;
        const hint = document.querySelector('#compareHint');
        if (comparison.yourOwned.size === 0) {
            hint.hidden = false;
            toast('Your tracker is empty. Add your sprites before comparing.', 'error');
            return;
        }
        hint.hidden = true;
        if (comparison.active) {
            comparison.active = false;
            store.state.filters.status = comparison.returnStatus;
        } else {
            comparison.returnStatus = store.state.filters.status;
            comparison.active = true;
            store.state.filters.status = 'all';
        }
        render();
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
    const hasPacked = params.has('s');
    const hasJson = params.has('share');
    const hasBitset = params.has('c');
    const shared = hasPacked
        ? decodeShare(params.get('s'), catalog.sprites)
        : hasJson
            ? decodeLegacyJsonShare(params.get('share'))
            : hasBitset
                ? decodeLegacyShare(params.get('c'), catalog.sprites)
                : null;
    if (!shared) {
        if (hasPacked || hasJson || hasBitset) {
            dom.sharedBanner.hidden = false;
            dom.sharedBanner.classList.add('is-error');
            dom.sharedBanner.querySelector('span').textContent = 'This shared collection link is invalid.';
        }
        return;
    }

    const yourCollection = store.snapshot();
    const matches = compareCollections(yourCollection.owned, shared.owned, catalog.released);
    comparison = {
        active: false,
        returnStatus: shared.status ?? 'all',
        yourOwned: new Set(yourCollection.owned),
        yours: new Set(matches.youCanOffer),
        theirs: new Set(matches.theyCanOffer),
    };

    store.state.filters = { search: '', theme: 'all', status: shared.status ?? 'all' };
    store.state.settings.hideMastered = false;
    store.state.settings.showUnreleased = false;
    store.replaceCollection(shared.owned, shared.mastered, { viewOnly: true });

    const total = catalog.released.length;
    const ownedCount = catalog.released.filter(sprite => store.isOwned(sprite.id)).length;
    const masteredCount = catalog.released.filter(sprite => store.isMastered(sprite.id)).length;

    dom.sharedBanner.hidden = false;
    dom.sharedBanner.innerHTML = `
        <div class="shared-summary">
            <span>Viewing shared collection &bull; <strong>${ownedCount}/${total}</strong> collected &bull; <strong>${masteredCount}</strong> mastered</span>
            <span class="compare-hint" id="compareHint" role="status" hidden>Your tracker is empty. Add your sprites first, then reopen this link.</span>
        </div>
        <div class="shared-actions">
            <button type="button" id="compareButton" aria-pressed="false">Compare trades</button>
            <a href="./">Open my tracker</a>
        </div>
    `;
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
