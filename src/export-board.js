import { TRACKER_URL } from './config.js';
import { activeThemes, exportTheme, familyMap } from './catalog.js';

const MODE_CONFIG = Object.freeze({
    collected: {
        title: 'COLLECTION',
        accent: '#65fbd2',
        filename: 'fnsprites-collection',
        empty: 'Collect a sprite before exporting your collection.',
    },
    missing: {
        title: 'MISSING',
        accent: '#ff4f87',
        filename: 'fnsprites-missing',
        empty: 'You have every released sprite.',
    },
    unmastered: {
        title: 'TO MASTER',
        accent: '#70c7ff',
        filename: 'fnsprites-to-master',
        empty: 'Every owned sprite is mastered.',
    },
    mastered: {
        title: 'MASTERED',
        accent: '#ffd43b',
        filename: 'fnsprites-mastered',
        empty: 'Master a sprite before exporting this board.',
    },
    trade: {
        title: 'TRADE BOARD',
        accent: '#65fbd2',
        filename: 'fnsprites-trade-board',
        empty: 'There are no released sprites to export.',
    },
});

const CARD_COLORS = Object.freeze({
    Rare: ['#11629a', '#07233d'],
    Epic: ['#6d2c87', '#25102f'],
    Legendary: ['#8d5423', '#392009'],
    Mythic: ['#9a7428', '#3b2b08'],
});

const THEME_COLORS = Object.freeze({
    Basic: ['#334152', '#111820'],
    Gold: ['#806523', '#292006'],
    Candy: ['#a03d6c', '#351020'],
    Galaxy: ['#493487', '#160d32'],
    Gem: ['#238273', '#092b27'],
    Holofoil: ['#43839a', '#102c38'],
    Cube: ['#6434a3', '#210f3d'],
    Rift: ['#246f82', '#092731'],
});

const LAYOUT = Object.freeze({
    outer: 18,
    header: 116,
    footer: 48,
    labelWidth: 116,
    cardWidth: 82,
    cardHeight: 100,
    cardGap: 8,
    rowGap: 12,
    sectionGap: 46,
    themeHeader: 30,
    maxRowsPerSection: 12,
    maxSectionColumns: 2,
    maxCanvasDimension: 16_384,
});

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(x, y, width, height, radius);
        return;
    }
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

function fitText(ctx, text, maxWidth, startSize, minSize, weight = 700) {
    let size = startSize;
    ctx.font = `${weight} ${size}px Oswald, sans-serif`;
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
        size -= 0.5;
        ctx.font = `${weight} ${size}px Oswald, sans-serif`;
    }
}

function loadImage(id, src) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve([id, image]);
        image.onerror = () => resolve([id, null]);
        image.src = src;
    });
}

function cardState(sprite, mode, store) {
    const owned = store.isOwned(sprite.id);
    const mastered = store.isMastered(sprite.id);
    if (mode === 'trade') return mastered ? 'mastered' : owned ? 'owned' : 'missing';
    if (mode === 'collected') return owned ? (mastered ? 'mastered' : 'owned') : 'hidden';
    if (mode === 'missing') return owned ? 'hidden' : 'missing';
    if (mode === 'unmastered') return owned && !mastered ? 'unmastered' : 'hidden';
    if (mode === 'mastered') return mastered ? 'mastered' : 'hidden';
    return 'hidden';
}

function drawCrown(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 5);
    ctx.lineTo(x + 7, y + 5);
    ctx.lineTo(x + 6, y - 3);
    ctx.lineTo(x + 2, y);
    ctx.lineTo(x, y - 6);
    ctx.lineTo(x - 2, y);
    ctx.lineTo(x - 6, y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawEmptySlot(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    roundRect(ctx, x, y, LAYOUT.cardWidth, LAYOUT.cardHeight, 6);
    ctx.stroke();
    ctx.restore();
}

function drawCard(ctx, sprite, state, image, x, y) {
    if (state === 'hidden') {
        drawEmptySlot(ctx, x, y);
        return;
    }

    const [top, bottom] = sprite.rarity === 'Special'
        ? THEME_COLORS[sprite.theme] || THEME_COLORS.Basic
        : CARD_COLORS[sprite.rarity] || CARD_COLORS.Rare;
    const imageHeight = LAYOUT.cardHeight - 22;
    const muted = state === 'missing';

    ctx.save();
    roundRect(ctx, x, y, LAYOUT.cardWidth, LAYOUT.cardHeight, 6);
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, y, 0, y + imageHeight);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, LAYOUT.cardWidth, imageHeight);
    ctx.fillStyle = '#10151b';
    ctx.fillRect(x, y + imageHeight, LAYOUT.cardWidth, 22);

    if (image) {
        const maxWidth = LAYOUT.cardWidth * 0.82;
        const maxHeight = imageHeight * 0.82;
        const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        if (muted) ctx.filter = 'grayscale(1) brightness(.42)';
        ctx.drawImage(
            image,
            x + (LAYOUT.cardWidth - width) / 2,
            y + (imageHeight - height) / 2 + 2,
            width,
            height,
        );
        ctx.filter = 'none';
    }

    if (muted) {
        ctx.fillStyle = 'rgba(7,10,14,.32)';
        ctx.fillRect(x, y, LAYOUT.cardWidth, imageHeight);
    }

    const accent = state === 'mastered'
        ? '#ffd43b'
        : state === 'missing'
            ? '#ff4f87'
            : state === 'unmastered'
                ? '#70c7ff'
                : '#65fbd2';
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + LAYOUT.cardHeight - 3, LAYOUT.cardWidth, 3);

    fitText(ctx, sprite.name.toUpperCase(), LAYOUT.cardWidth - 8, 10, 6.5);
    ctx.fillStyle = muted ? '#8893a0' : '#f6f8fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sprite.name.toUpperCase(), x + LAYOUT.cardWidth / 2, y + imageHeight + 10);
    ctx.restore();

    ctx.strokeStyle = state === 'mastered' ? '#ffd43b' : 'rgba(255,255,255,.11)';
    ctx.lineWidth = state === 'mastered' ? 2 : 1;
    roundRect(ctx, x, y, LAYOUT.cardWidth, LAYOUT.cardHeight, 6);
    ctx.stroke();
    if (state === 'mastered') drawCrown(ctx, x + LAYOUT.cardWidth - 10, y + 10);
}

function modeHasContent(sprite, mode, store) {
    return cardState(sprite, mode, store) !== 'hidden';
}

export function exportThemes(sprites, mode, store) {
    return activeThemes(sprites.filter(sprite => modeHasContent(sprite, mode, store)));
}

function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('The browser could not encode the export image.'));
                return;
            }

            try {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                resolve();
            } catch (error) {
                reject(error);
            }
        }, 'image/png');
    });
}

export async function exportBoard(mode, catalog, store, toast) {
    const config = MODE_CONFIG[mode];
    if (!config) return;

    const sprites = catalog.released;
    const families = familyMap(sprites);
    const familyKeys = [...families.keys()].filter(key =>
        [...families.get(key).values()].some(sprite => modeHasContent(sprite, mode, store)),
    );
    if (familyKeys.length === 0) {
        toast(config.empty, 'error');
        return;
    }

    toast('Building your image…');
    if (document.fonts?.ready) await document.fonts.ready;

    const relevantSprites = sprites.filter(sprite => modeHasContent(sprite, mode, store));
    const themes = exportThemes(sprites, mode, store);
    const images = new Map(await Promise.all([
        loadImage('brand', 'sprites/air_basic.png'),
        ...relevantSprites.map(sprite => loadImage(sprite.id, `sprites/${encodeURIComponent(sprite.id)}.png`)),
    ]));
    const missingImages = relevantSprites.filter(sprite => !images.get(sprite.id));
    if (missingImages.length) {
        throw new Error(`Missing export images: ${missingImages.map(sprite => sprite.id).join(', ')}`);
    }

    const sectionCount = Math.ceil(familyKeys.length / LAYOUT.maxRowsPerSection);
    const sectionColumns = Math.min(sectionCount, LAYOUT.maxSectionColumns);
    const sectionRows = Math.ceil(sectionCount / sectionColumns);
    const rowsPerSection = Math.ceil(familyKeys.length / sectionCount);
    const cardsWidth = themes.length * LAYOUT.cardWidth + Math.max(0, themes.length - 1) * LAYOUT.cardGap;
    const sectionWidth = LAYOUT.labelWidth + cardsWidth;
    const canvasWidth = LAYOUT.outer * 2
        + sectionWidth * sectionColumns
        + LAYOUT.sectionGap * Math.max(0, sectionColumns - 1);
    const rowsHeight = rowsPerSection * LAYOUT.cardHeight
        + Math.max(0, rowsPerSection - 1) * LAYOUT.rowGap;
    const sectionHeight = LAYOUT.themeHeader + rowsHeight;
    const canvasHeight = LAYOUT.outer * 2
        + LAYOUT.header
        + sectionHeight * sectionRows
        + LAYOUT.sectionGap * Math.max(0, sectionRows - 1)
        + LAYOUT.footer;
    if (
        canvasWidth > LAYOUT.maxCanvasDimension
        || canvasHeight > LAYOUT.maxCanvasDimension
    ) {
        throw new Error('The export is too large for this browser.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#090c10';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = config.accent;
    ctx.fillRect(0, 0, canvasWidth, 5);

    const brandImage = images.get('brand');
    if (brandImage) ctx.drawImage(brandImage, LAYOUT.outer, 25, 62, 62);

    ctx.fillStyle = '#f6f8fb';
    ctx.font = '700 28px Oswald, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SPRITES TRACKER', LAYOUT.outer + 76, 53);
    ctx.fillStyle = config.accent;
    ctx.font = '700 18px Oswald, sans-serif';
    ctx.fillText(config.title, LAYOUT.outer + 76, 79);

    const total = sprites.length;
    const owned = sprites.filter(sprite => store.isOwned(sprite.id)).length;
    const mastered = sprites.filter(sprite => store.isMastered(sprite.id)).length;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f6f8fb';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`${owned}/${total} collected`, canvasWidth - LAYOUT.outer, 47);
    ctx.fillStyle = '#9aa5b1';
    ctx.fillText(`${mastered}/${total} mastered`, canvasWidth - LAYOUT.outer, 73);

    if (mode === 'trade') {
        const legend = [
            ['OWNED', '#65fbd2'],
            ['MASTERED', '#ffd43b'],
            ['MISSING', '#ff4f87'],
        ];
        let legendX = canvasWidth - LAYOUT.outer;
        ctx.font = '700 10px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        for (const [label, color] of legend.reverse()) {
            const labelWidth = ctx.measureText(label).width;
            legendX -= labelWidth;
            ctx.fillStyle = '#9aa5b1';
            ctx.fillText(label, legendX, 96);
            legendX -= 12;
            ctx.fillStyle = color;
            ctx.fillRect(legendX, 92, 7, 7);
            legendX -= 14;
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(LAYOUT.outer, LAYOUT.outer + LAYOUT.header - 10);
    ctx.lineTo(canvasWidth - LAYOUT.outer, LAYOUT.outer + LAYOUT.header - 10);
    ctx.stroke();

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
        const sectionColumn = sectionIndex % sectionColumns;
        const sectionRow = Math.floor(sectionIndex / sectionColumns);
        const startX = LAYOUT.outer + sectionColumn * (sectionWidth + LAYOUT.sectionGap);
        const startY = LAYOUT.outer
            + LAYOUT.header
            + sectionRow * (sectionHeight + LAYOUT.sectionGap)
            + LAYOUT.themeHeader;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.fillStyle = '#9aa5b1';
        themes.forEach((theme, themeIndex) => {
            const x = startX + LAYOUT.labelWidth
                + themeIndex * (LAYOUT.cardWidth + LAYOUT.cardGap)
                + LAYOUT.cardWidth / 2;
            ctx.fillText(exportTheme(theme), x, startY - 17);
        });

        const sectionKeys = familyKeys.slice(
            sectionIndex * rowsPerSection,
            (sectionIndex + 1) * rowsPerSection,
        );

        sectionKeys.forEach((key, rowIndex) => {
            const y = startY + rowIndex * (LAYOUT.cardHeight + LAYOUT.rowGap);
            const name = catalog.familyName(key).toUpperCase();
            fitText(ctx, name, LAYOUT.labelWidth - 14, 14, 8);
            ctx.fillStyle = '#f6f8fb';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, startX + LAYOUT.labelWidth - 12, y + LAYOUT.cardHeight / 2);

            themes.forEach((theme, themeIndex) => {
                const x = startX + LAYOUT.labelWidth + themeIndex * (LAYOUT.cardWidth + LAYOUT.cardGap);
                const sprite = families.get(key).get(theme);
                if (!sprite) {
                    drawEmptySlot(ctx, x, y);
                    return;
                }
                drawCard(ctx, sprite, cardState(sprite, mode, store), images.get(sprite.id), x, y);
            });
        });
    }

    const footerY = canvasHeight - LAYOUT.footer;
    ctx.fillStyle = '#11161d';
    ctx.fillRect(0, footerY, canvasWidth, LAYOUT.footer);
    ctx.fillStyle = '#9aa5b1';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CGHXST.GITHUB.IO/FNSPRITES', canvasWidth / 2, footerY + LAYOUT.footer / 2);

    await downloadCanvas(canvas, config.filename);
    toast('Image ready.', 'success');
}

export function tradeList(catalog, store) {
    const sprites = catalog.released;
    const families = familyMap(sprites);
    const linesFor = predicate => [...families.entries()].flatMap(([key, themes]) => {
        const matches = [...themes.values()].filter(predicate);
        if (!matches.length) return [];
        return `${catalog.familyName(key)}: ${matches.map(sprite => exportTheme(sprite.theme)).join(', ')}`;
    });
    const owned = sprites.filter(sprite => store.isOwned(sprite.id)).length;
    const mastered = sprites.filter(sprite => store.isMastered(sprite.id)).length;

    return [
        'SPRITES TRACKER',
        '',
        'LOOKING FOR',
        ...linesFor(sprite => !store.isOwned(sprite.id)),
        '',
        'HAVE',
        ...linesFor(sprite => store.isOwned(sprite.id)),
        '',
        `Collected ${owned}/${sprites.length} | Mastered ${mastered}/${sprites.length}`,
        TRACKER_URL,
    ].join('\n');
}

export function tradeGrid(catalog, store) {
    const sprites = catalog.released;
    const themes = activeThemes(sprites);
    const families = familyMap(sprites);
    const owned = sprites.filter(sprite => store.isOwned(sprite.id)).length;
    const mastered = sprites.filter(sprite => store.isMastered(sprite.id)).length;
    const lines = [
        '```',
        '✅ Owned  👑 Mastered  ❌ Missing  ⬛ Variant does not exist',
        '',
        `| ${themes.map(exportTheme).join(' | ')} | Sprite`,
        '-----------------------',
    ];

    for (const [key, variants] of families) {
        const states = themes.map(theme => {
            const sprite = variants.get(theme);
            if (!sprite) return '⬛';
            if (store.isMastered(sprite.id)) return '👑';
            return store.isOwned(sprite.id) ? '✅' : '❌';
        });
        lines.push(`| ${states.join(' | ')} | ${catalog.familyName(key)}`);
    }
    lines.push(
        '',
        `Collected: ${owned}/${sprites.length}`,
        `Mastered: ${mastered}/${sprites.length}`,
        `Track yours: ${TRACKER_URL}`,
        '```',
    );
    return lines.join('\n');
}

export function downloadBackup(store) {
    const blob = new Blob([JSON.stringify(store.snapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fnsprites-backup.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
