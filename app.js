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
    shareBtn: document.getElementById('shareBtn'),
    collectionRatio: document.getElementById('collectionRatio'),
    collectionFill: document.getElementById('collectionFill'),
    masteryRatio: document.getElementById('masteryRatio'),
    masteryFill: document.getElementById('masteryFill'),
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

const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBits(bits) {
    while (bits.length % 5 !== 0) {
        bits += '0';
    }
    let code = '';
    for (let i = 0; i < bits.length; i += 5) {
        const val = parseInt(bits.substring(i, i + 5), 2);
        code += B32_CHARS[val];
    }
    return code.replace(/A+$/, '');
}

function decodeBits(code) {
    if (!code) return '';
    let bits = '';
    for (let i = 0; i < code.length; i++) {
        const val = B32_CHARS.indexOf(code[i]);
        if (val === -1) return '';
        bits += val.toString(2).padStart(5, '0');
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
    return `${obtainedCode}-${masteredCode}`;
}

function decompressCollection(sprites, code) {
    if (!code) return { obtained: [], mastered: [] };
    
    const parts = code.toUpperCase().split('-');
    if (parts.length > 2) {
        return { obtained: [], mastered: [] };
    }

    const obtainedCode = parts[0];
    const masteredCode = parts[1] || '';

    if (!/^[A-Z2-7]*$/.test(obtainedCode) || !/^[A-Z2-7]*$/.test(masteredCode)) {
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
   Progress
   =================================================== */

function updateProgress() {
    const released = baseSprites.filter(s => !s.unreleased);
    const total = released.length;
    const collected = released.filter(s => state.obtained.includes(s.id)).length;
    const mastered = released.filter(s => state.mastered.includes(s.id)).length;

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
        if (state.settings.hideMastered && state.mastered.includes(sprite.id)) return false;
        if (!state.settings.showUnreleased && sprite.unreleased) return false;
        if (state.viewMode && (!state.obtained.includes(sprite.id) || sprite.unreleased)) return false;

        const matchesSearch = sprite.name.toLowerCase().includes(state.filters.search.toLowerCase());
        const matchesTheme = state.filters.theme === 'all' || sprite.theme === state.filters.theme;

        let matchesStatus = true;
        if (!state.viewMode) {
            const isOwned = state.obtained.includes(sprite.id);
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
            let idxA = THEME_ORDER.indexOf(a.theme);
            let idxB = THEME_ORDER.indexOf(b.theme);
            if (idxA === -1) idxA = Infinity;
            if (idxB === -1) idxB = Infinity;
            if (idxA !== idxB) return idxA - idxB;
            return 0;
        });
    }
    if (method === 'sprite') {
        return sorted.sort((a, b) => {
            const familyA = a.id.split('_')[0];
            const familyB = b.id.split('_')[0];
            if (familyA !== familyB) return familyA.localeCompare(familyB);
            return THEME_ORDER.indexOf(a.theme) - THEME_ORDER.indexOf(b.theme);
        });
    }
    if (method === 'name') {
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (method === 'rarity') {
        return sorted.sort((a, b) => {
            let idxA = RARITY_ORDER.indexOf(a.rarity);
            let idxB = RARITY_ORDER.indexOf(b.rarity);
            if (idxA === -1) idxA = Infinity;
            if (idxB === -1) idxB = Infinity;
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
        const isObtained = state.obtained.includes(sprite.id);
        const isMastered = state.mastered.includes(sprite.id);

        const card = document.createElement('div');
        card.dataset.id = sprite.id;

        const classes = ['card', `rarity-${sprite.rarity}`, `theme-${sprite.theme}`];
        if (isObtained) classes.push('obtained');
        if (isMastered) classes.push('mastered');
        card.className = classes.join(' ');

        card.innerHTML = buildCardHTML(sprite, isObtained, isMastered);
        frag.appendChild(card);
    }

    dom.grid.innerHTML = '';
    dom.grid.appendChild(frag);
    fitCardNames();
    updateProgress();
}

function buildCardHTML(sprite, isObtained, isMastered) {
    const rarityLabel = sprite.rarity === 'Mythic' ? 'MYTHIC' : sprite.rarity.toUpperCase();
    const imgPath = `sprites/${sprite.id}.png`;

    let badge = '';
    if (sprite.unreleased) {
        badge = '<div class="card-badge unreleased-badge">Unreleased</div>';
    } else if (isMastered) {
        badge = '<div class="card-badge mastered-badge">Mastered</div>';
    } else if (isObtained) {
        badge = '<div class="card-badge collected">Collected</div>';
    }

    let crownAction = '';
    if (isObtained && !isMastered && !state.viewMode) {
        crownAction = '<button class="card-crown" title="Toggle mastery"><svg class="crown-icon" viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zM2 5l5 3.5L12 2l5 6.5L22 5v12H2V5z"/></svg></button>';
    }

    let crownDisplay = '';
    if (isMastered) {
        crownDisplay = '<div class="card-crown-display"><svg class="crown-icon" viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zM2 5l5 3.5L12 2l5 6.5L22 5v12H2V5z"/></svg></div>';
    }

    return `${badge}${crownAction}
        <div class="card-display">
            ${crownDisplay}
            <img src="${imgPath}" alt="${sprite.name}" loading="lazy">
            <div class="card-rarity">${rarityLabel}</div>
        </div>
        <div class="card-name"><span>${sprite.name}</span></div>`;
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
    if (state.obtained.includes(id)) {
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
    if (!state.obtained.includes(id)) return;
    if (state.mastered.includes(id)) {
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

function getFlatRarityColor(rarity, theme) {
    const map = { Rare: '#104273', Epic: '#4d1566', Legendary: '#743e0a', Mythic: '#70531c' };
    if (rarity !== 'Special') return map[rarity] || map.Rare;
    const themes = {
        Basic: '#1c2436', Gold: '#61460b', Candy: '#6b183f', Galaxy: '#1f1145',
        Gem: '#114c47', Holofoil: '#204454', Rift: '#154b5e',
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
            items: baseSprites.filter(s => state.obtained.includes(s.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'MY COLLECTION',
            fallback: 'MY COLLECTION', color: '#32cd32',
            filename: 'fnsprites-collection', emptyMsg: 'No collected sprites to export!',
            showBars: true,
        },
        missing: {
            items: baseSprites.filter(s => !s.unreleased && !state.obtained.includes(s.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: "I'M LOOKING FOR THESE!",
            fallback: 'MISSING SPRITES', color: '#ef4444',
            filename: 'fnsprites-missing', emptyMsg: "You aren't missing any released sprites!",
            showBars: false,
        },
        unmastered: {
            items: baseSprites.filter(s => state.obtained.includes(s.id) && !state.mastered.includes(s.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'UNMASTERED SPRITES',
            fallback: 'UNMASTERED', color: '#00f0ff',
            filename: 'fnsprites-unmastered', emptyMsg: "You don't have any unmastered sprites!",
            showBars: false,
        },
        mastered: {
            items: baseSprites.filter(s => state.obtained.includes(s.id) && state.mastered.includes(s.id)),
            titleL1: 'FORTNITE SPRITES TRACKER:', titleL2: 'MASTERED SPRITES',
            fallback: 'MASTERED', color: '#ffd700',
            filename: 'fnsprites-mastered', emptyMsg: "You don't have any mastered sprites!",
            showBars: false,
        },
    };

    const config = configs[mode];
    if (!config || config.items.length === 0) {
        toast(config?.emptyMsg || 'Nothing to export!', 'error');
        return null;
    }
    return config;
}

/* ===================================================
   Canvas Export - Card Renderer
   =================================================== */

function drawExportCard(ctx, sprite, x, y, w, h, img, mode) {
    const rarity = sprite.rarity || 'Rare';
    const theme = sprite.theme || 'Basic';
    const isMastered = state.mastered.includes(sprite.id);
    const isLowFi = state.settings.lowFidelity;
    const innerH = h - 38;

    /* Card base */
    ctx.fillStyle = '#0f141d';
    ctx.fillRect(x, y, w, h);

    /* Rarity background */
    if (isLowFi) {
        ctx.fillStyle = getFlatRarityColor(rarity, theme);
        ctx.fillRect(x, y, w, innerH);
    } else {
        const grad = ctx.createLinearGradient(x, y, x, y + innerH);
        const [c1, c2] = getRarityGradient(rarity, theme);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, innerH);

        if (rarity === 'Special') {
            const rainbow = ctx.createLinearGradient(x, y, x + w, y + innerH);
            rainbow.addColorStop(0, 'rgba(81,247,204,0.25)');
            rainbow.addColorStop(0.5, 'rgba(227,116,238,0.35)');
            rainbow.addColorStop(1, 'rgba(181,246,158,0.25)');
            ctx.fillStyle = rainbow;
            ctx.fillRect(x, y, w, innerH);
        }

        const shine = ctx.createLinearGradient(x, y, x, y + innerH);
        shine.addColorStop(0, 'rgba(255,255,255,0.2)');
        shine.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shine;
        ctx.fillRect(x, y, w, innerH);
    }

    /* Sprite image */
    if (img.complete && img.naturalWidth > 0) {
        const maxDim = w * 0.82;
        const ratio = Math.min(maxDim / img.width, maxDim / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        ctx.drawImage(img, x + (w - nw) / 2, y + (innerH - nh) / 2, nw, nh);
    }

    /* Status label */
    if (mode === 'collected' || mode === 'unmastered' || mode === 'mastered') {
        ctx.save();
        ctx.font = '900 13px "Oswald", sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isMastered ? '#ffd700' : '#22c55e';
        ctx.fillText(isMastered ? 'MASTERED' : 'COLLECTED', x + 6, y + 6);
        ctx.restore();
    }

    /* Rarity tag (angled shape) */
    const [tagBg, tagText] = getRarityTagColors(rarity);
    ctx.save();
    if (rarity === 'Special' && !isLowFi) {
        const tg = ctx.createLinearGradient(x, y + innerH - 18, x + 75, y + innerH - 18);
        tg.addColorStop(0, '#51f7cc');
        tg.addColorStop(0.5, '#e374ee');
        tg.addColorStop(1, '#b5f69e');
        ctx.fillStyle = tg;
    } else {
        ctx.fillStyle = tagBg;
    }
    ctx.beginPath();
    ctx.moveTo(x, y + innerH - 18);
    ctx.lineTo(x + 70, y + innerH - 18);
    ctx.lineTo(x + 82, y + innerH);
    ctx.lineTo(x, y + innerH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = tagText;
    ctx.font = '900 13px "Oswald", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rarity === 'Mythic' ? 'MYTHIC' : rarity.toUpperCase(), x + 6, y + innerH - 9);

    /* Name footer */
    ctx.fillStyle = 'rgba(15,20,29,0.9)';
    ctx.fillRect(x, y + innerH, w, 38);

    ctx.fillStyle = '#ffffff';
    let fontSize = 16.95;
    const name = sprite.name.toUpperCase();
    ctx.font = `${fontSize}px "Oswald", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    while (ctx.measureText(name).width > w - 8 && fontSize > 6) {
        fontSize -= 0.5;
        ctx.font = `${fontSize}px "Oswald", sans-serif`;
    }
    ctx.fillText(name, x + w / 2, y + innerH + 19);

    /* Bottom accent + border */
    ctx.fillStyle = isMastered ? '#ffd700' : tagBg;
    ctx.fillRect(x, y + h - 4, w, 4);

    ctx.strokeStyle = isMastered ? '#ffd700' : '#1a2233';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
}

/* ===================================================
   Canvas Export - Main
   =================================================== */

function exportImage(mode) {
    const config = getExportConfig(mode);
    if (!config) return;

    let items = config.items;
    items = sortSprites(items, state.settings.sortOrder);

    /* Layout constants */
    const CW = 160, CH = 200, PAD = 15, BORDER = 8, FOOTER_H = 55, MAX_COLS = 6;
    const cols = Math.min(MAX_COLS, items.length);
    const rows = Math.ceil(items.length / cols);
    const innerW = cols * (CW + PAD) + PAD;

    const barsInline = cols >= 5;
    const barsStacked = cols <= 2 && config.showBars;
    let headerH = 55;
    if (config.showBars) {
        if (barsStacked) headerH = 135;
        else if (!barsInline) headerH = 95;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = innerW + BORDER * 2;
    canvas.height = headerH + rows * (CH + PAD) + PAD + FOOTER_H + BORDER * 2;

    const mascot = new Image();
    mascot.src = 'siteimages/staticsprite.png';

    const onReady = () => {
        /* Border + inner background */
        ctx.fillStyle = config.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0b0d13';
        ctx.fillRect(BORDER, BORDER, canvas.width - BORDER * 2, canvas.height - BORDER * 2);

        /* Header background */
        ctx.fillStyle = '#181c25';
        ctx.fillRect(BORDER, BORDER, canvas.width - BORDER * 2, headerH);

        /* Header separator */
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(BORDER, BORDER + headerH);
        ctx.lineTo(canvas.width - BORDER, BORDER + headerH);
        ctx.stroke();

        /* Mascot */
        let textLeft = BORDER + PAD;
        if (mascot.complete && mascot.naturalWidth > 0) {
            const my = barsStacked ? BORDER + 12 : BORDER + headerH / 2 - 16;
            ctx.drawImage(mascot, textLeft, my, 32, 32);
            textLeft += 42;
        }

        /* Title text */
        ctx.fillStyle = config.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let availW = canvas.width - textLeft - BORDER - PAD;
        if (config.showBars && barsInline) availW -= 260;

        let fullTitle = `${config.titleL1} ${config.titleL2}`;
        if (mode === 'missing' && items.length === 1) {
            fullTitle = 'MISSING';
            config.fallback = 'MISSING';
        }

        let useFallback = false;
        ctx.font = 'italic 900 24px "Oswald", sans-serif';
        if (ctx.measureText(fullTitle).width > availW && (barsStacked || barsInline)) {
            useFallback = true;
        }

        if (barsStacked) {
            ctx.font = 'italic 900 20px "Oswald", sans-serif';
            ctx.fillText(config.fallback, textLeft, BORDER + 28);
        } else {
            let fs = 32;
            const text = useFallback ? config.fallback : fullTitle;
            ctx.font = `italic 900 ${fs}px "Oswald", sans-serif`;
            while (ctx.measureText(text).width > availW && fs > 12) {
                fs--;
                ctx.font = `italic 900 ${fs}px "Oswald", sans-serif`;
            }
            const cy = config.showBars && !barsInline ? BORDER + 30 : BORDER + headerH / 2;
            ctx.fillText(text, textLeft, cy);
        }

        /* Progress bars (collection mode only) */
        if (config.showBars) {
            const released = baseSprites.filter(s => !s.unreleased);
            const total = released.length;
            const colCount = released.filter(s => state.obtained.includes(s.id)).length;
            const masCount = released.filter(s => state.mastered.includes(s.id)).length;
            const colPct = total > 0 ? colCount / total : 0;
            const masPct = total > 0 ? masCount / total : 0;

            if (barsInline) {
                ctx.font = '900 12px "Oswald", sans-serif';
                const bw = 110;
                const re = canvas.width - BORDER - PAD;

                ctx.fillStyle = '#22c55e';
                ctx.fillText(`COLLECTION: ${colCount}/${total}`, re - bw * 2 - 25, BORDER + 16);
                ctx.fillStyle = '#0e1117';
                ctx.fillRect(re - bw * 2 - 25, BORDER + 31, bw, 12);
                ctx.strokeStyle = '#3b4253'; ctx.lineWidth = 1.5;
                ctx.strokeRect(re - bw * 2 - 25, BORDER + 31, bw, 12);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(re - bw * 2 - 25, BORDER + 32, bw * colPct, 10);

                ctx.fillStyle = '#ffd700';
                ctx.fillText(`MASTERY: ${masCount}/${total}`, re - bw, BORDER + 16);
                ctx.fillStyle = '#0e1117';
                ctx.fillRect(re - bw, BORDER + 31, bw, 12);
                ctx.strokeRect(re - bw, BORDER + 31, bw, 12);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(re - bw, BORDER + 32, bw * masPct, 10);
            } else if (barsStacked) {
                ctx.font = '900 11px "Oswald", sans-serif';
                const fw = canvas.width - BORDER * 2 - PAD * 2;
                const bx = BORDER + PAD;

                const cy1 = BORDER + 54;
                ctx.fillStyle = '#22c55e';
                ctx.fillText(`COLLECTION: ${colCount} / ${total}`, bx, cy1);
                ctx.fillStyle = '#0e1117'; ctx.fillRect(bx, cy1 + 10, fw, 12);
                ctx.strokeStyle = '#3b4253'; ctx.strokeRect(bx, cy1 + 10, fw, 12);
                ctx.fillStyle = '#22c55e'; ctx.fillRect(bx, cy1 + 11, fw * colPct, 10);

                const cy2 = BORDER + 94;
                ctx.fillStyle = '#ffd700';
                ctx.fillText(`MASTERY: ${masCount} / ${total}`, bx, cy2);
                ctx.fillStyle = '#0e1117'; ctx.fillRect(bx, cy2 + 10, fw, 12);
                ctx.strokeStyle = '#3b4253'; ctx.strokeRect(bx, cy2 + 10, fw, 12);
                ctx.fillStyle = '#ffd700'; ctx.fillRect(bx, cy2 + 11, fw * masPct, 10);
            } else {
                ctx.font = '900 12px "Oswald", sans-serif';
                const my = BORDER + 68;
                const bx = BORDER + PAD;

                ctx.fillStyle = '#22c55e';
                ctx.fillText(`COLLECTION: ${colCount} / ${total}`, bx, my);
                ctx.fillStyle = '#0e1117'; ctx.fillRect(bx + 135, my - 6, 85, 12);
                ctx.strokeStyle = '#3b4253'; ctx.strokeRect(bx + 135, my - 6, 85, 12);
                ctx.fillStyle = '#22c55e'; ctx.fillRect(bx + 135, my - 5, 85 * colPct, 10);

                ctx.fillStyle = '#ffd700';
                ctx.fillText(`MASTERY: ${masCount} / ${total}`, bx + 240, my);
                ctx.fillStyle = '#0e1117'; ctx.fillRect(bx + 335, my - 6, 85, 12);
                ctx.strokeRect(bx + 335, my - 6, 85, 12);
                ctx.fillStyle = '#ffd700'; ctx.fillRect(bx + 335, my - 5, 85 * masPct, 10);
            }
        }

        /* Load and draw each card */
        let loaded = 0;
        items.forEach((sprite, i) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = `sprites/${sprite.id}.png`;

            const onCard = () => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = BORDER + PAD + col * (CW + PAD);
                const y = BORDER + headerH + PAD + row * (CH + PAD);
                drawExportCard(ctx, sprite, x, y, CW, CH, img, mode);

                loaded++;
                if (loaded === items.length) {
                    /* Footer */
                    ctx.fillStyle = '#0e1117';
                    ctx.fillRect(BORDER, canvas.height - FOOTER_H - BORDER, canvas.width - BORDER * 2, FOOTER_H);
                    const url = 'cghxst.github.io/fnsprites/';
                    let fs = 24;
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${fs}px "Oswald", sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const maxW = canvas.width - BORDER * 2 - 30;
                    while (ctx.measureText(url).width > maxW && fs > 8) {
                        fs--;
                        ctx.font = `bold ${fs}px "Oswald", sans-serif`;
                    }
                    ctx.fillText(url, canvas.width / 2, canvas.height - BORDER - FOOTER_H / 2);

                    /* Download */
                    const link = document.createElement('a');
                    link.download = `${config.filename}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    toast('Image exported!', 'success');
                }
            };

            img.onload = onCard;
            img.onerror = onCard;
        });
    };

    mascot.onload = onReady;
    mascot.onerror = onReady;
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
        dom.exportDropdown.classList.toggle('open');
    });

    dom.exportDropdown.querySelectorAll('[data-export]').forEach(btn => {
        btn.addEventListener('click', () => {
            exportImage(btn.dataset.export);
            dom.exportDropdown.classList.remove('open');
        });
    });

    document.addEventListener('click', (e) => {
        if (!dom.exportDropdown.contains(e.target)) {
            dom.exportDropdown.classList.remove('open');
        }
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