/* ===================================================
   Constants
   =================================================== */

const KEYS = {
    obtained: 'fn_obtained_sprites',
    mastered: 'fn_mastered_sprites',
    search: 'fn_state_search',
    theme: 'fn_state_theme',
    status: 'fn_state_status_filter',
    hideMastered: 'fn_state_hide_mastered',
    sortOrder: 'fn_state_sort_order',
    showUnreleased: 'fn_state_unreleased',
    lowFidelity: 'fn_state_low_fidelity',
};

const THEME_ORDER = ['Basic', 'Gold', 'Candy', 'Galaxy', 'Gem', 'Holofoil', 'Rift'];
const RARITY_ORDER = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Special'];

/* ===================================================
   State
   =================================================== */

const state = {
    obtained: [],
    mastered: [],
    viewMode: false,
    filters: { search: '', theme: 'all', status: 'all' },
    settings: {
        hideMastered: false,
        sortOrder: 'theme',
        showUnreleased: false,
        lowFidelity: false,
    },
};

/* ===================================================
   DOM References
   =================================================== */

const dom = {
    viewBanner: document.getElementById('viewBanner'),
    grid: document.getElementById('spriteGrid'),
    searchInput: document.getElementById('searchInput'),
    themeFilter: document.getElementById('themeFilter'),
    sortOrder: document.getElementById('sortOrder'),
    statusPills: document.getElementById('statusPills'),
    hideMastered: document.getElementById('hideMastered'),
    showUnreleased: document.getElementById('showUnreleased'),
    lowFidelity: document.getElementById('lowFidelity'),
    exportDropdown: document.getElementById('exportDropdown'),
    exportToggle: document.getElementById('exportToggle'),
    copyDropdown: document.getElementById('copyDropdown'),
    copyToggle: document.getElementById('copyToggle'),
    shareBtn: document.getElementById('shareBtn'),
    copyTradeTextBtn: document.getElementById('copyTradeTextBtn'),
    copyTradeGridBtn: document.getElementById('copyTradeGridBtn'),
    collectionRatio: document.getElementById('collectionRatio'),
    collectionFill: document.getElementById('collectionFill'),
    masteryRatio: document.getElementById('masteryRatio'),
    masteryFill: document.getElementById('masteryFill'),
    exportBackupBtn: document.getElementById('exportBackupBtn'),
    importBtn: document.getElementById('importBtn'),
    importInput: document.getElementById('importInput'),
};

/* ===================================================
   Persistence
   =================================================== */

function persist(key, value) {
    localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
}

function load() {
    state.obtained = JSON.parse(localStorage.getItem(KEYS.obtained)) || [];
    state.mastered = JSON.parse(localStorage.getItem(KEYS.mastered)) || [];
    state.filters.search = localStorage.getItem(KEYS.search) || '';
    state.filters.theme = localStorage.getItem(KEYS.theme) || 'all';

    let savedStatus = localStorage.getItem(KEYS.status) || 'all';
    if (savedStatus === 'obtained') savedStatus = 'owned';
    state.filters.status = savedStatus;

    state.settings.hideMastered = localStorage.getItem(KEYS.hideMastered) === 'true';
    
    let savedSort = localStorage.getItem(KEYS.sortOrder);
    if (!savedSort) {
        const legacyGroup = localStorage.getItem('fn_state_group_theme');
        savedSort = legacyGroup === 'false' ? 'sprite' : 'theme';
    }
    state.settings.sortOrder = savedSort;

    state.settings.showUnreleased = localStorage.getItem(KEYS.showUnreleased) === 'true';
    state.settings.lowFidelity = localStorage.getItem(KEYS.lowFidelity) === 'true';
}

function applyStateToDOM() {
    dom.searchInput.value = state.filters.search;
    dom.themeFilter.value = state.filters.theme;
    dom.sortOrder.value = state.settings.sortOrder;
    dom.hideMastered.checked = state.settings.hideMastered;
    dom.showUnreleased.checked = state.settings.showUnreleased;
    dom.lowFidelity.checked = state.settings.lowFidelity;
    if (state.settings.lowFidelity) document.body.classList.add('low-fidelity');

    dom.statusPills.querySelectorAll('.pill').forEach(pill => {
        const match =
            (pill.dataset.status === 'all' && state.filters.status === 'all') ||
            (pill.dataset.status === 'owned' && state.filters.status === 'owned') ||
            (pill.dataset.status === 'missing' && state.filters.status === 'missing');
        pill.classList.toggle('active', match);
    });
}

/* ===================================================
   Share Encoding / Decoding
   =================================================== */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encodeBits(bits) {
    while (bits.length % 6 !== 0) {
        bits += '0';
    }
    let code = '';
    for (let i = 0; i < bits.length; i += 6) {
        const val = parseInt(bits.substring(i, i + 6), 2);
        code += B64_CHARS[val];
    }
    return code.replace(/A+$/, '');
}

function decodeBits(code) {
    if (!code) return '';
    let bits = '';
    for (let i = 0; i < code.length; i++) {
        const val = B64_CHARS.indexOf(code[i]);
        if (val === -1) return '';
        bits += val.toString(2).padStart(6, '0');
    }
    return bits;
}

function compressCollection(sprites, obtained, mastered) {
    let obtainedBits = '';
    let masteredBits = '';
    
    sprites.forEach(s => {
        obtainedBits += obtained.includes(s.id) ? '1' : '0';
        masteredBits += mastered.includes(s.id) ? '1' : '0';
    });

    const obtainedCode = encodeBits(obtainedBits);
    const masteredCode = encodeBits(masteredBits);

    if (!masteredCode) {
        return obtainedCode;
    }
    return `${obtainedCode}~${masteredCode}`;
}

function decompressCollection(sprites, code) {
    if (!code) return { obtained: [], mastered: [] };
    
    const parts = code.split('~');
    if (parts.length > 2) {
        return { obtained: [], mastered: [] };
    }

    const obtainedCode = parts[0];
    const masteredCode = parts[1] || '';

    if (!/^[A-Za-z0-9\-_]*$/.test(obtainedCode) || !/^[A-Za-z0-9\-_]*$/.test(masteredCode)) {
        return { obtained: [], mastered: [] };
    }

    try {
        const obtainedBits = decodeBits(obtainedCode);
        const masteredBits = decodeBits(masteredCode);

        const obtained = [];
        const mastered = [];

        sprites.forEach((s, idx) => {
            const isObtained = obtainedBits[idx] === '1';
            const isMastered = masteredBits[idx] === '1';

            if (isObtained) {
                obtained.push(s.id);
                if (isMastered) {
                    mastered.push(s.id);
                }
            }
        });

        return { obtained, mastered };
    } catch {
        return { obtained: [], mastered: [] };
    }
}

/* ===================================================
   Toast Notifications
   =================================================== */

function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => {
        el.classList.remove('visible');
        el.addEventListener('transitionend', () => el.remove());
    }, 2500);
}

/* ===================================================
   Sprite Helpers
   =================================================== */

function getFamilyKey(sprite) {
    return sprite.id.split('_')[0];
}

function getReleasedSprites() {
    return baseSprites.filter(sprite => !sprite.unreleased);
}

function getFamilyKeys(sprites = getReleasedSprites()) {
    return sprites.reduce((keys, sprite) => {
        const key = getFamilyKey(sprite);
        if (!keys.includes(key)) keys.push(key);
        return keys;
    }, []);
}

function getActiveThemes(sprites = getReleasedSprites()) {
    return sprites
        .reduce((themes, sprite) => {
            if (!themes.includes(sprite.theme)) themes.push(sprite.theme);
            return themes;
        }, [])
        .sort((a, b) => getOrderedIndex(THEME_ORDER, a) - getOrderedIndex(THEME_ORDER, b));
}

function getOrderedIndex(order, value) {
    const index = order.indexOf(value);
    return index === -1 ? Infinity : index;
}

function isObtained(id) {
    return state.obtained.includes(id);
}

function isMastered(id) {
    return state.mastered.includes(id);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    }[char]));
}

/* ===================================================
   Progress
   =================================================== */

function updateProgress() {
    const released = getReleasedSprites();
    const total = released.length;
    const collected = released.filter(sprite => isObtained(sprite.id)).length;
    const mastered = released.filter(sprite => isMastered(sprite.id)).length;

    dom.collectionRatio.textContent = `${collected} / ${total}`;
    dom.collectionFill.style.width = total > 0 ? `${(collected / total) * 100}%` : '0%';
    dom.masteryRatio.textContent = `${mastered} / ${total}`;
    dom.masteryFill.style.width = total > 0 ? `${(mastered / total) * 100}%` : '0%';
}
/* ===================================================
   Filtering & Sorting
   =================================================== */

function filterSprites() {
    return baseSprites.filter(sprite => {
        if (state.settings.hideMastered && isMastered(sprite.id)) return false;
        if (!state.settings.showUnreleased && sprite.unreleased) return false;
        if (state.viewMode && (!isObtained(sprite.id) || sprite.unreleased)) return false;

        const matchesSearch = sprite.name.toLowerCase().includes(state.filters.search.toLowerCase());
        const matchesTheme = state.filters.theme === 'all' || sprite.theme === state.filters.theme;

        let matchesStatus = true;
        if (!state.viewMode) {
            const isOwned = isObtained(sprite.id);
            if (state.filters.status === 'owned') matchesStatus = isOwned;
            if (state.filters.status === 'missing') matchesStatus = !isOwned;
        }

        return matchesSearch && matchesTheme && matchesStatus;
    });
}

function sortSprites(items, method) {
    const sorted = [...items];
    if (method === 'theme') {
        return sorted.sort((a, b) => {
            const idxA = getOrderedIndex(THEME_ORDER, a.theme);
            const idxB = getOrderedIndex(THEME_ORDER, b.theme);
            if (idxA !== idxB) return idxA - idxB;
            return 0;
        });
    }
    if (method === 'sprite') {
        return sorted.sort((a, b) => {
            const familyA = getFamilyKey(a);
            const familyB = getFamilyKey(b);
            if (familyA !== familyB) return familyA.localeCompare(familyB);
            return getOrderedIndex(THEME_ORDER, a.theme) - getOrderedIndex(THEME_ORDER, b.theme);
        });
    }
    if (method === 'name') {
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (method === 'rarity') {
        return sorted.sort((a, b) => {
            const idxA = getOrderedIndex(RARITY_ORDER, a.rarity);
            const idxB = getOrderedIndex(RARITY_ORDER, b.rarity);
            if (idxA !== idxB) return idxA - idxB;
            return a.name.localeCompare(b.name);
        });
    }
    return sorted;
}

/* ===================================================
   Rendering
   =================================================== */

function renderGrid() {
    let items = filterSprites();
    items = sortSprites(items, state.settings.sortOrder);

    const frag = document.createDocumentFragment();

    for (const sprite of items) {
        const obtained = isObtained(sprite.id);
        const mastered = isMastered(sprite.id);

        const card = document.createElement('div');
        card.dataset.id = sprite.id;

        const classes = ['card', `rarity-${sprite.rarity}`, `theme-${sprite.theme}`];
        if (obtained) classes.push('obtained');
        if (mastered) classes.push('mastered');
        card.className = classes.join(' ');

        card.innerHTML = buildCardHTML(sprite, obtained, mastered);
        frag.appendChild(card);
    }

    dom.grid.innerHTML = '';
    dom.grid.appendChild(frag);
    fitCardNames();
    updateProgress();
}

function buildCardHTML(sprite, obtained, mastered) {
    const rarityLabel = sprite.rarity === 'Mythic' ? 'MYTHIC' : sprite.rarity.toUpperCase();
    const imgPath = `sprites/${encodeURIComponent(sprite.id)}.png`;
    const safeName = escapeHTML(sprite.name);
    const safeRarity = escapeHTML(rarityLabel);

    let badge = '';
    if (sprite.unreleased) {
        badge = '<div class="card-badge unreleased-badge">Unreleased</div>';
    } else if (mastered) {
        badge = '<div class="card-badge mastered-badge">Mastered</div>';
    } else if (obtained) {
        badge = '<div class="card-badge collected">Collected</div>';
    }

    let crownAction = '';
    if (obtained && !mastered && !state.viewMode) {
        crownAction = '<button class="card-crown" title="Toggle mastery"><svg class="crown-icon" viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zM2 5l5 3.5L12 2l5 6.5L22 5v12H2V5z"/></svg></button>';
    }

    let crownDisplay = '';
    if (mastered) {
        crownDisplay = '<div class="card-crown-display"><svg class="crown-icon" viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zM2 5l5 3.5L12 2l5 6.5L22 5v12H2V5z"/></svg></div>';
    }

    return `${badge}${crownAction}
        <div class="card-display">
            ${crownDisplay}
            <img src="${imgPath}" alt="${safeName}" loading="lazy">
            <div class="card-rarity">${safeRarity}</div>
        </div>
        <div class="card-name"><span>${safeName}</span></div>`;
}

function fitCardNames() {
    document.querySelectorAll('.card-name span').forEach(span => {
        const parent = span.parentElement;
        if (!parent || parent.clientWidth === 0) return;
        let size = 14;
        span.style.fontSize = size + 'px';
        while (span.scrollWidth > parent.clientWidth && size > 8) {
            size -= 0.5;
            span.style.fontSize = size + 'px';
        }
    });
}

/* ===================================================
   Collection Actions
   =================================================== */

function toggleObtained(id) {
    if (isObtained(id)) {
        state.obtained = state.obtained.filter(x => x !== id);
        state.mastered = state.mastered.filter(x => x !== id);
    } else {
        state.obtained.push(id);
    }
    persist(KEYS.obtained, state.obtained);
    persist(KEYS.mastered, state.mastered);
    renderGrid();
}

function toggleMastery(id) {
    if (!isObtained(id)) return;
    if (isMastered(id)) {
        state.mastered = state.mastered.filter(x => x !== id);
    } else {
        state.mastered.push(id);
    }
    persist(KEYS.mastered, state.mastered);
    renderGrid();
}

/* ===================================================
   Canvas Export - Helpers
   =================================================== */

function getRarityGradient(rarity, theme) {
    const map = {
        Rare: ['#104273', '#081a35'],
        Epic: ['#4d1566', '#1e052c'],
        Legendary: ['#743e0a', '#301702'],
        Mythic: ['#70531c', '#2e2107'],
    };
    if (rarity !== 'Special') return map[rarity] || map.Rare;

    const themes = {
        Basic: ['#1c2436', '#0c0f17'], Gold: ['#61460b', '#241a02'],
        Candy: ['#6b183f', '#260514'], Galaxy: ['#1f1145', '#080314'],
        Gem: ['#114c47', '#041a18'], Holofoil: ['#204454', '#09171f'],
        Rift: ['#154b5e', '#04161c'],
    };
    return themes[theme] || themes.Basic;
}

function getRarityTagColors(rarity) {
    const map = {
        Rare: ['#004A8E', '#00FFFB'], Epic: ['#511D7F', '#ED2BFF'],
        Legendary: ['#8E4122', '#FBC568'], Mythic: ['#80622A', '#FFF1A9'],
        Special: ['#51f7cc', '#000000'],
    };
    return map[rarity] || map.Rare;
}

function getExportConfig(mode) {
    const configs = {
        collected: {
            items: baseSprites.filter(sprite => isObtained(sprite.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'MY COLLECTION',
            color: '#32cd32',
            filename: 'fnsprites-collection', emptyMsg: 'No collected sprites to export!',
        },
        missing: {
            items: getReleasedSprites().filter(sprite => !isObtained(sprite.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: "I'M LOOKING FOR THESE!",
            color: '#ef4444',
            filename: 'fnsprites-missing', emptyMsg: "You aren't missing any released sprites!",
        },
        unmastered: {
            items: baseSprites.filter(sprite => isObtained(sprite.id) && !isMastered(sprite.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'UNMASTERED SPRITES',
            color: '#00f0ff',
            filename: 'fnsprites-unmastered', emptyMsg: "You don't have any unmastered sprites!",
        },
        mastered: {
            items: baseSprites.filter(sprite => isObtained(sprite.id) && isMastered(sprite.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'MASTERED SPRITES',
            color: '#ffd700',
            filename: 'fnsprites-mastered', emptyMsg: "You don't have any mastered sprites!",
        },
        trade: {
            items: getReleasedSprites(),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'TRADE CARD',
            color: '#ffd700',
            filename: 'fnsprites-trade-card', emptyMsg: 'No sprites to export!',
        },
    };

    const config = configs[mode];
    if (!config || config.items.length === 0) {
        toast(config?.emptyMsg || 'Nothing to export!', 'error');
        return null;
    }
    return config;
}

function drawCrown(ctx, cx, cy) {
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 5);
    ctx.lineTo(cx + 7, cy + 5);
    ctx.lineTo(cx + 7, cy - 2);
    ctx.lineTo(cx + 3, cy + 1.5);
    ctx.lineTo(cx, cy - 4.5);
    ctx.lineTo(cx - 3, cy + 1.5);
    ctx.lineTo(cx - 7, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawMiniCard(ctx, sprite, x, y, w, h, cardState, imageMap) {
    if (cardState === 'empty') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        drawRoundRect(ctx, x, y, w, h, 8);
        ctx.stroke();
        ctx.restore();
        return;
    }

    const rarity = sprite.rarity || 'Rare';
    const theme = sprite.theme || 'Basic';
    const innerH = h - 22; // 100 - 22 = 78

    const isMastered = cardState === 'mastered';
    const isGrayed = cardState === 'missing_gray';
    const isMissing = cardState === 'missing_gray' || cardState === 'missing_color';

    /* Card base background */
    ctx.fillStyle = '#0f141d';
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    /* Rarity background */
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, innerH, 8);
    ctx.clip();

    const grad = ctx.createLinearGradient(x, y, x, y + innerH);
    const [c1, c2] = getRarityGradient(rarity, theme);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, innerH);

    /* Special rainbow overlay */
    if (rarity === 'Special') {
        const rainbow = ctx.createLinearGradient(x, y, x + w, y + innerH);
        rainbow.addColorStop(0, 'rgba(81,247,204,0.25)');
        rainbow.addColorStop(0.5, 'rgba(227,116,238,0.35)');
        rainbow.addColorStop(1, 'rgba(181,246,158,0.25)');
        ctx.fillStyle = rainbow;
        ctx.fillRect(x, y, w, innerH);
    }

    /* Highlight shine */
    const shine = ctx.createLinearGradient(x, y, x, y + innerH);
    shine.addColorStop(0, 'rgba(255,255,255,0.12)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(x, y, w, innerH);

    if (isGrayed) {
        ctx.fillStyle = 'rgba(11, 13, 20, 0.45)';
        ctx.fillRect(x, y, w, innerH);
    }
    ctx.restore();

    /* Sprite image */
    const img = imageMap[sprite.id];
    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        drawRoundRect(ctx, x, y, w, innerH, 8);
        ctx.clip();

        if (isGrayed) {
            try {
                ctx.filter = 'grayscale(100%) brightness(48%)';
            } catch (e) {}
        }
        const maxDim = w * 0.82;
        const ratio = Math.min(maxDim / img.width, maxDim / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        ctx.drawImage(img, x + (w - nw) / 2, y + (innerH - nh) / 2, nw, nh);
        ctx.restore();

        if (isGrayed) {
            ctx.fillStyle = 'rgba(15, 20, 30, 0.15)';
            ctx.beginPath();
            drawRoundRect(ctx, x, y, w, innerH, 8);
            ctx.fill();
        }
    }

    /* Status label */
    ctx.save();
    ctx.font = '900 8.5px "Oswald", sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let labelText = 'COLLECTED';
    let labelColor = '#22c55e';
    if (isMastered) {
        labelText = 'MASTERED';
        labelColor = '#ffd700';
    } else if (isMissing) {
        labelText = 'MISSING';
        labelColor = '#ef4444';
    }

    ctx.fillStyle = labelColor;
    ctx.fillText(labelText, x + 5, y + 5);
    ctx.restore();

    /* Rarity tag (angled shape) */
    const [tagBg, tagText] = getRarityTagColors(rarity);
    ctx.save();
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, innerH, 8);
    ctx.clip();

    if (rarity === 'Special') {
        const tg = ctx.createLinearGradient(x, y + innerH - 12, x + w * 0.6, y + innerH - 12);
        tg.addColorStop(0, '#51f7cc');
        tg.addColorStop(0.5, '#e374ee');
        tg.addColorStop(1, '#b5f69e');
        ctx.fillStyle = tg;
    } else {
        ctx.fillStyle = tagBg;
    }
    ctx.beginPath();
    ctx.moveTo(x, y + innerH - 12);
    ctx.lineTo(x + w * 0.48, y + innerH - 12);
    ctx.lineTo(x + w * 0.58, y + innerH);
    ctx.lineTo(x, y + innerH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = tagText;
    ctx.font = '900 8.5px "Oswald", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarity === 'Mythic' ? 'MYTHIC' : rarity.toUpperCase(), x + 4, y + innerH - 6);

    /* Name/Theme footer */
    ctx.fillStyle = 'rgba(15,20,29,0.9)';
    ctx.fillRect(x, y + innerH, w, 22);

    ctx.fillStyle = isMissing ? '#ef4444' : '#ffffff';
    let fontSize = 9.5;
    const name = sprite.name.toUpperCase();
    ctx.font = `bold ${fontSize}px "Oswald", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    while (ctx.measureText(name).width > w - 6 && fontSize > 6.5) {
        fontSize -= 0.5;
        ctx.font = `bold ${fontSize}px "Oswald", sans-serif`;
    }
    ctx.fillText(name, x + w / 2, y + innerH + 11);

    /* Bottom accent + border */
    let bottomAccentColor = tagBg;
    let borderColor = '#1a2233';
    if (isMastered) {
        bottomAccentColor = '#ffd700';
        borderColor = '#ffd700';
    } else if (isMissing) {
        bottomAccentColor = '#ef4444';
    } else if (cardState === 'unmastered') {
        bottomAccentColor = '#00f0ff';
    }

    ctx.fillStyle = bottomAccentColor;
    ctx.fillRect(x, y + h - 3, w, 3);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isMastered ? 2 : 1;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    /* Crown at top center */
    if (isMastered) {
        drawCrown(ctx, x + w / 2, y - 2);
    }
}

/* ===================================================
   Canvas Export - Status Icons & Trade Card Exporter
   =================================================== */

function drawRoundRect(ctx, x, y, width, height, radius) {
    if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
    } else {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

function exportImage(mode) {
    const config = getExportConfig(mode);
    if (!config) return;

    // Helper functions for names
    const getCharName = (charKey) => {
        const basicSprite = baseSprites.find(s => s.id === `${charKey}_basic`);
        return basicSprite ? basicSprite.name : (charKey.charAt(0).toUpperCase() + charKey.slice(1));
    };

    const getDisplayName = (name) => {
        if (name === 'Burnt Peanut') return name;
        return `${name} Sprite`;
    };

    // Gather released sprites, character families, and active theme columns.
    const releasedSprites = getReleasedSprites();
    const charKeys = getFamilyKeys(releasedSprites);
    const activeThemes = getActiveThemes(releasedSprites);

    const getThemeDisplayName = (theme) => {
        const maps = { 'Basic': 'NORMAL', 'Candy': 'GUMMY' };
        return maps[theme] || theme.toUpperCase();
    };

    const THEMES = activeThemes.map(theme => {
        return {
            name: getThemeDisplayName(theme),
            themeName: theme
        };
    });

    // Load assets (mascot and all released sprites)
    const imagesToLoad = [];
    imagesToLoad.push({ id: 'mascot', src: 'siteimages/staticsprite.png' });
    releasedSprites.forEach(sprite => {
        imagesToLoad.push({ id: sprite.id, src: `sprites/${encodeURIComponent(sprite.id)}.png` });
    });

    const loadImage = (item) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve({ id: item.id, img, success: true });
            img.onerror = () => resolve({ id: item.id, img, success: false });
            img.src = item.src;
        });
    };

    toast('Generating image export...', 'info');

    Promise.all(imagesToLoad.map(loadImage)).then(loadedImages => {
        const imageMap = {};
        loadedImages.forEach(res => {
            if (res.success) {
                imageMap[res.id] = res.img;
            }
        });

        // Mapping function for card states
        const getCardState = (sprite, mode) => {
            const isOwned = isObtained(sprite.id);
            const mastered = isMastered(sprite.id);

            if (mode === 'trade') {
                return isOwned ? (mastered ? 'mastered' : 'owned') : 'missing_gray';
            } else if (mode === 'collected') {
                return isOwned ? (mastered ? 'mastered' : 'owned') : 'empty';
            } else if (mode === 'missing') {
                return !isOwned ? 'missing_color' : 'empty';
            } else if (mode === 'mastered') {
                return mastered ? 'mastered' : 'empty';
            } else if (mode === 'unmastered') {
                return (isOwned && !mastered) ? 'unmastered' : 'empty';
            }
            return 'empty';
        };

        // Filter out empty rows
        const activeCharKeys = charKeys.filter(charKey => {
            const themeSprites = releasedSprites.filter(sprite => getFamilyKey(sprite) === charKey);
            return themeSprites.some(s => getCardState(s, mode) !== 'empty');
        });

        // Split characters into two columns
        const half = Math.ceil(activeCharKeys.length / 2);
        const leftColumnKeys = activeCharKeys.slice(0, half);
        const rightColumnKeys = activeCharKeys.slice(half);

        // Dimensions for the binder sheet
        const BORDER = 8;
        const HEADER_H = 80;
        const COL_HEADER_H = 35;
        const CW = 80;
        const CH = 100;
        const ROW_GAP = 12;
        const CARD_GAP = 8;
        const LABEL_W = 120;
        const COL_GAP = 60;
        const FOOTER_H = 60;

        const maxRows = Math.max(leftColumnKeys.length, rightColumnKeys.length);
        const rowH = CH + ROW_GAP;
        const rowsH = maxRows * rowH;

        // Card block width
        const cardBlockW = THEMES.length * CW + (THEMES.length - 1) * CARD_GAP;
        const colW = LABEL_W + cardBlockW;

        const canvasW = colW * 2 + COL_GAP + BORDER * 2 + 40;
        const canvasH = BORDER * 2 + HEADER_H + COL_HEADER_H + rowsH + FOOTER_H;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvasW;
        canvas.height = canvasH;

        // Border gradient
        let borderGrad;
        if (mode === 'trade') {
            borderGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
            borderGrad.addColorStop(0, '#ffd700');
            borderGrad.addColorStop(1, '#22c55e');
            ctx.fillStyle = borderGrad;
        } else {
            ctx.fillStyle = config.color;
            borderGrad = config.color;
        }
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Inner Background
        ctx.fillStyle = '#0b0d13';
        ctx.fillRect(BORDER, BORDER, canvasW - BORDER * 2, canvasH - BORDER * 2);

        // Header Background
        ctx.fillStyle = '#181c25';
        ctx.fillRect(BORDER, BORDER, canvasW - BORDER * 2, HEADER_H);

        // Header separator
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(BORDER, BORDER + HEADER_H);
        ctx.lineTo(canvasW - BORDER, BORDER + HEADER_H);
        ctx.stroke();

        // Mascot
        let textLeft = BORDER + 20;
        const mascotImg = imageMap['mascot'];
        if (mascotImg) {
            ctx.drawImage(mascotImg, textLeft, BORDER + HEADER_H / 2 - 16, 32, 32);
            textLeft += 42;
        }

        // Title text
        ctx.fillStyle = borderGrad;
        ctx.font = 'italic 900 26px "Oswald", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const fullTitle = `${config.titleL1} ${config.titleL2}`;
        ctx.fillText(fullTitle, textLeft, BORDER + HEADER_H / 2);

        // Header Stats / Progress Bars
        const totalCount = releasedSprites.length;
        const ownedCount = releasedSprites.filter(sprite => isObtained(sprite.id)).length;
        const masteredCount = releasedSprites.filter(sprite => isMastered(sprite.id)).length;
        const colPct = totalCount > 0 ? ownedCount / totalCount : 0;
        const masPct = totalCount > 0 ? masteredCount / totalCount : 0;

        ctx.font = '900 12px "Oswald", sans-serif';
        const bw = 110;
        const re = canvasW - BORDER - 20;

        // Collection Progress
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`COLLECTION: ${ownedCount}/${totalCount}`, re - bw * 2 - 25, BORDER + 28);
        ctx.fillStyle = '#0e1117';
        ctx.fillRect(re - bw * 2 - 25, BORDER + 43, bw, 12);
        ctx.strokeStyle = '#3b4253'; ctx.lineWidth = 1.5;
        ctx.strokeRect(re - bw * 2 - 25, BORDER + 43, bw, 12);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(re - bw * 2 - 25, BORDER + 44, bw * colPct, 10);

        // Mastery Progress
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`MASTERY: ${masteredCount}/${totalCount}`, re - bw, BORDER + 28);
        ctx.fillStyle = '#0e1117';
        ctx.fillRect(re - bw, BORDER + 43, bw, 12);
        ctx.strokeRect(re - bw, BORDER + 43, bw, 12);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(re - bw, BORDER + 44, bw * masPct, 10);

        const startTableY = BORDER + HEADER_H + COL_HEADER_H;

        // Column headers drawing helper
        const drawColHeaders = (startX) => {
            ctx.fillStyle = '#8891a5';
            ctx.font = 'bold 12px "Oswald", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            THEMES.forEach((t, i) => {
                const cx = startX + LABEL_W + i * (CW + CARD_GAP) + CW / 2;
                ctx.fillText(t.name, cx, startTableY - 8);
            });
        };

        const leftTableX = BORDER + 20;
        const rightTableX = leftTableX + colW + COL_GAP;

        drawColHeaders(leftTableX);
        if (rightColumnKeys.length > 0) {
            drawColHeaders(rightTableX);
        }



        // Drawing a single character family row
        const drawRow = (charKey, startX, y) => {
            const name = getCharName(charKey);
            const displayName = getDisplayName(name);

            // Draw label
            ctx.fillStyle = '#ffffff';
            let fontSize = 14;
            ctx.font = `bold ${fontSize}px "Oswald", sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            while (ctx.measureText(displayName).width > LABEL_W - 12 && fontSize > 8) {
                fontSize -= 0.5;
                ctx.font = `bold ${fontSize}px "Oswald", sans-serif`;
            }
            ctx.fillText(displayName, startX + LABEL_W - 10, y + CH / 2);

            // Draw cards
            THEMES.forEach((t, colIndex) => {
                const cx = startX + LABEL_W + colIndex * (CW + CARD_GAP);
                const s = releasedSprites.find(sprite => getFamilyKey(sprite) === charKey && sprite.theme === t.themeName);

                if (s) {
                    const cardState = getCardState(s, mode);
                    drawMiniCard(ctx, s, cx, y, CW, CH, cardState, imageMap);
                } else {
                    // Empty slot dashed outline
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath();
                    drawRoundRect(ctx, cx, y, CW, CH, 8);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        };

        // Draw columns
        leftColumnKeys.forEach((charKey, idx) => {
            const y = startTableY + idx * rowH;
            drawRow(charKey, leftTableX, y);
        });

        rightColumnKeys.forEach((charKey, idx) => {
            const y = startTableY + idx * rowH;
            drawRow(charKey, rightTableX, y);
        });

        // Footer
        ctx.fillStyle = '#0e1117';
        ctx.fillRect(BORDER, canvasH - FOOTER_H - BORDER, canvasW - BORDER * 2, FOOTER_H);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Oswald", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CGHXST.GITHUB.IO/FNSPRITES', canvasW / 2, canvasH - BORDER - FOOTER_H / 2);

        // Download
        const link = document.createElement('a');
        link.download = `${config.filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast('Image exported successfully!', 'success');
    });
}

/* ===================================================
   Trade Text Generation
   =================================================== */

function generateTradeText() {
    const releasedSprites = getReleasedSprites();
    const charKeys = getFamilyKeys(releasedSprites);

    const getCharName = (charKey) => {
        const basicSprite = baseSprites.find(s => s.id === `${charKey}_basic`);
        return basicSprite ? basicSprite.name : (charKey.charAt(0).toUpperCase() + charKey.slice(1));
    };

    const themeMaps = {
        'Basic': 'Base',
        'Candy': 'Gummy'
    };
    const formatThemeName = (theme) => themeMaps[theme] || theme;

    const total = releasedSprites.length;
    const collected = releasedSprites.filter(sprite => isObtained(sprite.id)).length;
    const mastered = releasedSprites.filter(sprite => isMastered(sprite.id)).length;

    const buildSection = (title, selectSprites) => {
        const lines = [];

        charKeys.forEach(charKey => {
            const name = getCharName(charKey);
            const themeSprites = releasedSprites.filter(sprite => getFamilyKey(sprite) === charKey);
            const selected = selectSprites(themeSprites);
            if (selected.length === 0) return;

            const list = selected.map(sprite => formatThemeName(sprite.theme)).join(', ');
            lines.push(`  ▸ ${name} ➔ ${list}`);
        });

        return lines.length > 0 ? `【 ${title} 】\n${lines.join('\n')}` : '';
    };

    const sections = [
        buildSection('LOOKING FOR', sprites => sprites.filter(sprite => !isObtained(sprite.id))),
        buildSection('HAVE', sprites => sprites.filter(sprite => isObtained(sprite.id))),
        buildSection('STILL NEED TO MASTER', sprites => sprites.filter(sprite => isObtained(sprite.id) && !isMastered(sprite.id))),
        [
            `Collected: ${collected}/${total}`,
            `Mastered: ${mastered}/${total}`,
            'Track yours: https://cghxst.github.io/fnsprites/',
        ].join('\n'),
    ].filter(Boolean);

    return sections.join('\n\n');
}

function generateTradeGridText() {
    const getCharName = (charKey) => {
        const basicSprite = baseSprites.find(s => s.id === `${charKey}_basic`);
        return basicSprite ? basicSprite.name : charKey.charAt(0).toUpperCase() + charKey.slice(1);
    };

    const releasedSprites = getReleasedSprites();
    const activeThemes = getActiveThemes(releasedSprites);
    const charKeys = getFamilyKeys(releasedSprites);

    const getThemeDisplayName = (theme) => {
        const maps = { 'Basic': 'NORMAL', 'Candy': 'GUMMY' };
        return maps[theme] || theme.toUpperCase();
    };

    const total = releasedSprites.length;
    const collected = releasedSprites.filter(sprite => isObtained(sprite.id)).length;
    const mastered = releasedSprites.filter(sprite => isMastered(sprite.id)).length;

    let lines = [
        '```',
        '✅ Owned  👑 Mastered  ❌ Missing',
        '',
        `| ${activeThemes.map(getThemeDisplayName).join(' | ')} | Sprite`,
        '-----------------------',
    ];

    charKeys.forEach(charKey => {
        const themeSprites = releasedSprites.filter(sprite => getFamilyKey(sprite) === charKey);
        
        const rowStates = activeThemes.map(theme => {
            const s = themeSprites.find(x => x.theme === theme);
            if (!s) return '⬛';
            if (isMastered(s.id)) return '👑';
            return isObtained(s.id) ? '✅' : '❌';
        });

        lines.push(`| ${rowStates.join(' | ')} | ${getCharName(charKey)}`);
    });

    lines.push(
        '',
        `Collected: ${collected}/${total}`,
        `Mastered: ${mastered}/${total}`,
        'Track yours: https://cghxst.github.io/fnsprites/',
        '```'
    );

    return lines.join('\n');
}

/* ===================================================
   Event Binding
   =================================================== */

function bindEvents() {
    /* Image error delegation (using capture phase since error does not bubble) */
    dom.grid.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            e.target.style.opacity = '0.2';
        }
    }, true);

    /* Grid - event delegation */
    dom.grid.addEventListener('click', (e) => {
        if (state.viewMode) return;
        const crown = e.target.closest('.card-crown');
        const card = e.target.closest('.card');
        if (!card) return;

        const id = card.dataset.id;
        if (crown) {
            e.stopPropagation();
            toggleMastery(id);
        } else {
            toggleObtained(id);
        }
    });

    /* Search */
    dom.searchInput.addEventListener('input', () => {
        state.filters.search = dom.searchInput.value;
        persist(KEYS.search, state.filters.search);
        renderGrid();
    });

    /* Theme filter */
    dom.themeFilter.addEventListener('change', () => {
        state.filters.theme = dom.themeFilter.value;
        persist(KEYS.theme, state.filters.theme);
        renderGrid();
    });

    /* Sort order dropdown */
    dom.sortOrder.addEventListener('change', () => {
        state.settings.sortOrder = dom.sortOrder.value;
        persist(KEYS.sortOrder, state.settings.sortOrder);
        renderGrid();
    });

    /* Status pills */
    dom.statusPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill || state.viewMode) return;
        state.filters.status = pill.dataset.status;
        persist(KEYS.status, state.filters.status);
        dom.statusPills.querySelectorAll('.pill').forEach(p => {
            p.classList.toggle('active', p === pill);
        });
        renderGrid();
    });

    /* Toggle switches */
    const switchKeys = ['hideMastered', 'showUnreleased', 'lowFidelity'];
    switchKeys.forEach(key => {
        dom[key].addEventListener('change', () => {
            state.settings[key] = dom[key].checked;
            persist(KEYS[key], state.settings[key]);
            if (key === 'lowFidelity') {
                document.body.classList.toggle('low-fidelity', dom[key].checked);
            }
            renderGrid();
        });
    });

    /* Export dropdown */
    dom.exportToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.copyDropdown.classList.remove('open');
        dom.exportDropdown.classList.toggle('open');
    });

    dom.exportDropdown.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', () => {
            exportImage(btn.dataset.export);
            dom.exportDropdown.classList.remove('open');
        });
    });

    /* Copy dropdown */
    dom.copyToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.exportDropdown.classList.remove('open');
        dom.copyDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!dom.exportDropdown.contains(e.target)) {
            dom.exportDropdown.classList.remove('open');
        }
        if (!dom.copyDropdown.contains(e.target)) {
            dom.copyDropdown.classList.remove('open');
        }
    });

    /* Backup Export */
    dom.exportBackupBtn.addEventListener('click', () => {
        const data = {
            obtained: state.obtained,
            mastered: state.mastered
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'fnsprites-backup.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast('Backup file exported!', 'success');
        dom.exportDropdown.classList.remove('open');
    });

    /* Backup Import */
    dom.importBtn.addEventListener('click', () => {
        if (state.viewMode) {
            toast('Cannot import in view-only mode!', 'error');
            return;
        }
        dom.importInput.click();
    });

    dom.importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data || !Array.isArray(data.obtained) || !Array.isArray(data.mastered)) {
                    throw new Error('Invalid backup file format');
                }

                const validIds = new Set(baseSprites.map(s => s.id));
                const obtained = data.obtained.filter(id => validIds.has(id));
                const mastered = data.mastered.filter(id => validIds.has(id) && obtained.includes(id));

                state.obtained = obtained;
                state.mastered = mastered;

                persist(KEYS.obtained, state.obtained);
                persist(KEYS.mastered, state.mastered);

                renderGrid();
                toast('Collection imported successfully!', 'success');
            } catch (err) {
                toast('Failed to import: invalid JSON format', 'error');
                console.error(err);
            }
            dom.importInput.value = '';
        };
        reader.readAsText(file);
    });

    /* Copy trade list */
    dom.copyTradeTextBtn.addEventListener('click', () => {
        const text = generateTradeText();
        navigator.clipboard.writeText(text).then(() => {
            toast('Trade list copied to clipboard!', 'success');
        }).catch(() => {
            toast('Failed to copy trade list', 'error');
        });
        dom.copyDropdown.classList.remove('open');
    });

    /* Copy trade grid */
    dom.copyTradeGridBtn.addEventListener('click', () => {
        const text = generateTradeGridText();
        navigator.clipboard.writeText(text).then(() => {
            toast('Trade grid copied to clipboard!', 'success');
        }).catch(() => {
            toast('Failed to copy trade grid', 'error');
        });
        dom.copyDropdown.classList.remove('open');
    });

    /* Share */
    dom.shareBtn.addEventListener('click', () => {
        const code = compressCollection(baseSprites, state.obtained, state.mastered);
        const url = `${location.origin}${location.pathname}?c=${code}`;
        navigator.clipboard.writeText(url).then(() => {
            toast('Share link copied to clipboard!', 'success');
        }).catch(() => {
            toast('Failed to copy link', 'error');
        });
    });
}

/* ===================================================
   Initialization
   =================================================== */

function init() {
    if (typeof baseSprites === 'undefined') {
        console.error('baseSprites is not defined.');
        return;
    }

    const params = new URLSearchParams(location.search);
    const shareCode = params.get('c');

    if (shareCode) {
        state.viewMode = true;
        const decoded = decompressCollection(baseSprites, shareCode);
        state.obtained = decoded.obtained;
        state.mastered = decoded.mastered;
        dom.viewBanner.hidden = false;
    } else {
        load();
    }

    applyStateToDOM();
    renderGrid();
    bindEvents();
}

init();
