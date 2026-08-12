import { TRACKER_URL, spritePalette } from './config.js';
import { activeSeasons, activeThemes, exportTheme, familyMap, seasonBadgeInfo } from './catalog.js';

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

const LAYOUT = Object.freeze({
    outer: 18,
    header: 116,
    compactHeader: 130,
    compactTradeHeader: 158,
    compactHeaderBreakpoint: 560,
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

function drawCheckBadge(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x - 1, y + 3.5);
    ctx.lineTo(x + 4.5, y - 3);
    ctx.stroke();
    ctx.restore();
}

function drawLock(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const bodyWidth = 14;
    const bodyHeight = 11;
    const bodyX = x - bodyWidth / 2;
    const bodyY = y - 1;
    roundRect(ctx, bodyX, bodyY, bodyWidth, bodyHeight, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x, bodyY, 5.5, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
}

function drawCard(ctx, sprite, state, image, x, y, mode, seasonImage = null) {
    if (state === 'hidden') {
        drawEmptySlot(ctx, x, y);
        return;
    }

    const [top, bottom] = spritePalette(sprite);
    const imageHeight = LAYOUT.cardHeight - 22;
    const tradeMissing = state === 'missing' && mode === 'trade';

    ctx.save();
    roundRect(ctx, x, y, LAYOUT.cardWidth, LAYOUT.cardHeight, 6);
    ctx.clip();

    if (tradeMissing) {
        ctx.fillStyle = '#141822';
        ctx.fillRect(x, y, LAYOUT.cardWidth, imageHeight);
    } else {
        const gradient = ctx.createLinearGradient(0, y, 0, y + imageHeight);
        gradient.addColorStop(0, top);
        gradient.addColorStop(1, bottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, LAYOUT.cardWidth, imageHeight);
    }
    ctx.fillStyle = tradeMissing ? '#10131a' : '#10151b';
    ctx.fillRect(x, y + imageHeight, LAYOUT.cardWidth, 22);

    if (image) {
        const maxWidth = LAYOUT.cardWidth * 0.82;
        const maxHeight = imageHeight * 0.82;
        const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        if (tradeMissing) ctx.filter = 'brightness(0.18) grayscale(1)';
        ctx.drawImage(
            image,
            x + (LAYOUT.cardWidth - width) / 2,
            y + (imageHeight - height) / 2 + 2,
            width,
            height,
        );
        ctx.filter = 'none';
    }

    const accent = state === 'mastered'
        ? '#ffd43b'
        : state === 'missing'
            ? '#ff4f87'
            : state === 'unmastered'
                ? '#70c7ff'
                : '#65fbd2';
    ctx.fillStyle = accent;
    ctx.fillRect(x, y + LAYOUT.cardHeight - 5, LAYOUT.cardWidth, 5);

    fitText(ctx, sprite.name.toUpperCase(), LAYOUT.cardWidth - 8, 10, 6.5);
    ctx.fillStyle = '#f6f8fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sprite.name.toUpperCase(), x + LAYOUT.cardWidth / 2, y + imageHeight + 10);
    ctx.restore();

    if (state === 'mastered') {
        ctx.strokeStyle = '#ffd43b';
        ctx.lineWidth = 2.5;
    } else if (state === 'missing' && mode === 'missing') {
        ctx.strokeStyle = 'rgba(255, 79, 135, 0.6)';
        ctx.lineWidth = 2;
    } else if (state === 'owned') {
        ctx.strokeStyle = 'rgba(101, 251, 210, 0.5)';
        ctx.lineWidth = 2;
    } else if (state === 'unmastered') {
        ctx.strokeStyle = 'rgba(112, 199, 255, 0.5)';
        ctx.lineWidth = 2;
    } else {
        ctx.strokeStyle = 'rgba(255,255,255,.08)';
        ctx.lineWidth = 1;
    }
    roundRect(ctx, x, y, LAYOUT.cardWidth, LAYOUT.cardHeight, 6);
    ctx.stroke();

    if (state === 'mastered') drawCrown(ctx, x + LAYOUT.cardWidth - 11, y + 11);
    if (state === 'owned' || state === 'unmastered') drawCheckBadge(ctx, x + LAYOUT.cardWidth - 11, y + 11);
    if (tradeMissing) drawLock(ctx, x + LAYOUT.cardWidth / 2, y + imageHeight / 2 - 2);

    const img = Array.isArray(seasonImage) ? seasonImage[1] : seasonImage;
    if (img && typeof img === 'object' && 'naturalWidth' in img) {
        const badgeSize = 20;
        const badgeX = x + 4;
        const badgeY = y + 4;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(9, 12, 16, 0.85)';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(img, badgeX, badgeY, badgeSize, badgeSize);
        ctx.restore();
    }
}

function modeHasContent(sprite, mode, store) {
    return cardState(sprite, mode, store) !== 'hidden';
}

export function exportThemes(sprites, mode, store) {
    return activeThemes(sprites.filter(sprite => modeHasContent(sprite, mode, store)));
}

export function exportHeaderHeight(canvasWidth, mode) {
    if (canvasWidth >= LAYOUT.compactHeaderBreakpoint) return LAYOUT.header;
    return mode === 'trade' ? LAYOUT.compactTradeHeader : LAYOUT.compactHeader;
}

export function exportLayout(familyCount, themeCount, mode) {
    const sectionColumns = familyCount > LAYOUT.maxRowsPerSection
        ? LAYOUT.maxSectionColumns
        : 1;
    const sectionCount = Math.min(familyCount, sectionColumns);
    const rowsPerSection = Math.ceil(familyCount / sectionCount);
    const cardsWidth = themeCount * LAYOUT.cardWidth
        + Math.max(0, themeCount - 1) * LAYOUT.cardGap;
    const sectionWidth = LAYOUT.labelWidth + cardsWidth;
    const canvasWidth = LAYOUT.outer * 2
        + sectionWidth * sectionColumns
        + LAYOUT.sectionGap * Math.max(0, sectionColumns - 1);
    const headerHeight = exportHeaderHeight(canvasWidth, mode);
    const rowsHeight = rowsPerSection * LAYOUT.cardHeight
        + Math.max(0, rowsPerSection - 1) * LAYOUT.rowGap;
    const sectionHeight = LAYOUT.themeHeader + rowsHeight;
    const canvasHeight = LAYOUT.outer * 2 + headerHeight + sectionHeight + LAYOUT.footer;

    return {
        canvasHeight,
        canvasWidth,
        headerHeight,
        rowsPerSection,
        sectionColumns,
        sectionCount,
        sectionWidth,
    };
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

    const availableSeasons = activeSeasons(catalog.sprites);
    const selectedSeasons = availableSeasons.filter(season =>
        store?.isSeasonSelected ? store.isSeasonSelected(season) : true,
    );

    const showUnreleased = store?.state?.settings?.showUnreleased || false;
    const sprites = catalog.sprites.filter(sprite => {
        if (!showUnreleased && sprite.unreleased) return false;
        if (!selectedSeasons.includes(sprite.season)) return false;
        return true;
    });

    const families = familyMap(sprites);
    const familyKeys = [...families.keys()].filter(key =>
        [...families.get(key).values()].some(sprite => modeHasContent(sprite, mode, store)),
    );
    if (familyKeys.length === 0) {
        const isFiltered = selectedSeasons.length < availableSeasons.length;
        toast(isFiltered ? 'No matching sprites found for the selected season(s).' : config.empty, 'error');
        return;
    }

    toast('Building your image…');
    if (document.fonts?.ready) await document.fonts.ready;

    const relevantSprites = sprites.filter(sprite => modeHasContent(sprite, mode, store));
    const themes = exportThemes(sprites, mode, store);
    const uniqueSeasons = [...new Set(relevantSprites.map(s => s.season))];
    const [imagesArray, seasonImagesArray] = await Promise.all([
        Promise.all([
            loadImage('brand', 'sprites/air_basic.png'),
            ...relevantSprites.map(sprite => loadImage(sprite.id, `sprites/${encodeURIComponent(sprite.id)}.png`)),
        ]),
        Promise.all(
            uniqueSeasons.map(async season => {
                const info = seasonBadgeInfo(season);
                let [, img] = await loadImage(`season_${season}`, info.src);
                if (!img) {
                    const [, fallback] = await loadImage(`season_fallback_${season}`, info.fallbackSrc);
                    img = fallback;
                }
                return [season, img];
            }),
        ),
    ]);
    const images = new Map(imagesArray);
    const seasonImages = new Map(seasonImagesArray);

    const missingImages = relevantSprites.filter(sprite => !images.get(sprite.id));
    if (missingImages.length) {
        throw new Error(`Missing export images: ${missingImages.map(sprite => sprite.id).join(', ')}`);
    }

    const layout = exportLayout(familyKeys.length, themes.length, mode);
    const {
        canvasHeight,
        canvasWidth,
        headerHeight,
        rowsPerSection,
        sectionColumns,
        sectionCount,
        sectionWidth,
    } = layout;
    const compactHeader = canvasWidth < LAYOUT.compactHeaderBreakpoint;
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
    const brandSize = compactHeader ? 44 : 62;
    const brandY = compactHeader ? 24 : 25;
    if (brandImage) ctx.drawImage(brandImage, LAYOUT.outer, brandY, brandSize, brandSize);

    const titleX = LAYOUT.outer + (compactHeader ? 56 : 76);
    ctx.fillStyle = '#f6f8fb';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    if (compactHeader) {
        fitText(ctx, 'SPRITES TRACKER', canvasWidth - titleX - LAYOUT.outer, 20, 15);
    } else {
        ctx.font = '700 28px Oswald, sans-serif';
    }
    ctx.fillText('SPRITES TRACKER', titleX, compactHeader ? 43 : 53);
    ctx.fillStyle = config.accent;
    ctx.font = `700 ${compactHeader ? 15 : 18}px Oswald, sans-serif`;
    let seasonLabel = '';
    if (selectedSeasons.length === 1 && availableSeasons.length > 1) {
        seasonLabel = ` • ${selectedSeasons[0].toUpperCase()}`;
    } else if (selectedSeasons.length < availableSeasons.length) {
        seasonLabel = ` • ${selectedSeasons.length} SEASONS`;
    }
    const displayTitle = `${config.title}${seasonLabel}`;
    ctx.fillText(displayTitle, titleX, compactHeader ? 67 : 79);

    const total = sprites.length;
    const owned = sprites.filter(sprite => store.isOwned(sprite.id)).length;
    const mastered = sprites.filter(sprite => store.isMastered(sprite.id)).length;
    if (compactHeader) {
        ctx.font = '600 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f6f8fb';
        ctx.fillText(`${owned}/${total} collected`, LAYOUT.outer, 102);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#9aa5b1';
        ctx.fillText(`${mastered}/${total} mastered`, canvasWidth - LAYOUT.outer, 102);
    } else {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f6f8fb';
        ctx.font = '600 15px system-ui, sans-serif';
        ctx.fillText(`${owned}/${total} collected`, canvasWidth - LAYOUT.outer, 47);
        ctx.fillStyle = '#9aa5b1';
        ctx.fillText(`${mastered}/${total} mastered`, canvasWidth - LAYOUT.outer, 73);
    }

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
            ctx.fillText(label, legendX, compactHeader ? 128 : 96);
            legendX -= 12;
            ctx.fillStyle = color;
            ctx.fillRect(legendX, compactHeader ? 124 : 92, 7, 7);
            legendX -= 14;
        }
    }

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(LAYOUT.outer, LAYOUT.outer + headerHeight - 10);
    ctx.lineTo(canvasWidth - LAYOUT.outer, LAYOUT.outer + headerHeight - 10);
    ctx.stroke();

    for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
        const sectionColumn = sectionIndex % sectionColumns;
        const startX = LAYOUT.outer + sectionColumn * (sectionWidth + LAYOUT.sectionGap);
        const startY = LAYOUT.outer
            + headerHeight
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
                drawCard(ctx, sprite, cardState(sprite, mode, store), images.get(sprite.id), x, y, mode, seasonImages.get(sprite.season));
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

    let seasonSuffix = '';
    if (selectedSeasons.length === 1 && availableSeasons.length > 1) {
        seasonSuffix = `-${selectedSeasons[0].toLowerCase()}`;
    } else if (selectedSeasons.length < availableSeasons.length) {
        seasonSuffix = `-custom`;
    }
    await downloadCanvas(canvas, `${config.filename}${seasonSuffix}`);
    toast('Image ready.', 'success');
}

export function tradeGrid(catalog, store) {
    const availableSeasons = activeSeasons(catalog.sprites);
    const selectedSeasons = availableSeasons.filter(season =>
        store?.isSeasonSelected ? store.isSeasonSelected(season) : true,
    );
    const showUnreleased = store?.state?.settings?.showUnreleased || false;
    const sprites = catalog.sprites.filter(sprite => {
        if (!showUnreleased && sprite.unreleased) return false;
        if (!selectedSeasons.includes(sprite.season)) return false;
        return true;
    });
    const themes = activeThemes(sprites);
    const families = familyMap(sprites);
    const owned = sprites.filter(sprite => store.isOwned(sprite.id)).length;
    const mastered = sprites.filter(sprite => store.isMastered(sprite.id)).length;
    const header = themes.map(exportTheme).join('|');
    const seasonNote = selectedSeasons.length < availableSeasons.length
        ? [`Seasons: ${selectedSeasons.join(', ')}`]
        : [];
    const lines = [
        '```',
        '✅ Owned  👑 Mastered  ❌ Missing  ⬛ Variant does not exist',
        ...seasonNote,
        '',
        header,
        '-'.repeat(header.length),
    ];

    for (const [key, variants] of families) {
        const states = themes.map(theme => {
            const sprite = variants.get(theme);
            if (!sprite) return '⬛';
            if (store.isMastered(sprite.id)) return '👑';
            return store.isOwned(sprite.id) ? '✅' : '❌';
        });
        lines.push(`${states.join('|')} ${catalog.familyName(key)}`);
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
