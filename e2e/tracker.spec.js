import { expect, test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { decodeShare, encodeShare } from '../src/share.js';

const test = base.extend({
    page: async ({ page }, use) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
            if (message.type() === 'error') {
                const location = message.location().url;
                errors.push(`${message.text()}${location ? ` (${location})` : ''}`);
            }
        });
        await use(page);
        expect(errors, 'browser console and page errors').toEqual([]);
    },
});

test.beforeEach(async ({ page }) => {
    await page.goto('/');
});

test('renders the released catalog with valid interactive structure', async ({ page }) => {
    await expect(page).toHaveTitle('Fortnite Sprites Tracker');
    await expect(page.locator('.sprite-card')).toHaveCount(93);
    await expect(page.locator('.sprite-group')).toHaveCount(23);
    await expect(page.locator('button button')).toHaveCount(0);
    await expect(page.locator('[role="menu"], [role="menuitem"]')).toHaveCount(0);
    await expect(page.locator('#groupOrder')).toHaveValue('sprite');
    const externalResources = await page.evaluate(() =>
        performance.getEntriesByType('resource')
            .map(entry => new URL(entry.name).origin)
            .filter(origin => origin !== location.origin),
    );
    expect(externalResources).toEqual([]);
});

test('has no automated WCAG A or AA violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
    expect(results.violations.map(violation => ({
        id: violation.id,
        targets: violation.nodes.map(node => node.target),
    }))).toEqual([]);
});

test('owns, masters, filters, and restores a sprite', async ({ page }) => {
    const air = page.locator('[data-id="air_basic"]');
    await air.locator('.sprite-art').click();
    await expect(air).toHaveClass(/is-owned/);
    await expect(page.locator('#collectionRatio')).toHaveText('1 / 93');

    await air.locator('.mastery-button').click();
    await expect(air).toHaveClass(/is-mastered/);
    await expect(page.locator('#masteryRatio')).toHaveText('1 / 93');

    await page.reload();
    await expect(page.locator('[data-id="air_basic"]')).toHaveClass(/is-mastered/);
    await page.getByRole('button', { name: 'Owned', exact: true }).click();
    await expect(page.locator('.sprite-card')).toHaveCount(1);
});

test('search is responsive and popovers restore keyboard focus', async ({ page }) => {
    await page.locator('#searchInput').fill('batman');
    await expect(page.locator('.sprite-card')).toHaveCount(6);

    await page.locator('#moreToggle').click();
    await expect(page.locator('#copyTradeButton')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#moreToggle')).toBeFocused();
    await expect(page.locator('#moreToggle')).toHaveAttribute('aria-expanded', 'false');
});

test('downloads, imports, and validates collection backups', async ({ page }) => {
    await page.locator('[data-id="air_basic"] .sprite-art').click();
    await page.locator('#moreToggle').click();
    const backupPromise = page.waitForEvent('download');
    await page.locator('#backupButton').click();
    const backup = await backupPromise;
    expect(backup.suggestedFilename()).toBe('fnsprites-backup.json');
    const backupStream = await backup.createReadStream();
    const backupChunks = [];
    for await (const chunk of backupStream) backupChunks.push(chunk);
    expect(JSON.parse(Buffer.concat(backupChunks).toString('utf8'))).toEqual({
        version: 2,
        owned: ['air_basic'],
        mastered: [],
    });

    await page.locator('#importInput').setInputFiles({
        name: 'collection.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({
            version: 2,
            owned: ['air_basic', 'water_basic'],
            mastered: ['air_basic'],
        })),
    });
    await expect(page.locator('#collectionRatio')).toHaveText('2 / 93');
    await expect(page.locator('#masteryRatio')).toHaveText('1 / 93');

    await page.locator('#importInput').setInputFiles({
        name: 'invalid.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"owned":"wrong"}'),
    });
    await expect(page.locator('.toast-error')).toContainText('not valid');
});

test('copies useful trade text and stable share links', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('[data-id="air_basic"] .sprite-art').click();

    await page.locator('#moreToggle').click();
    await page.locator('#copyTradeButton').click();
    const tradeText = await page.evaluate(() => navigator.clipboard.readText());
    expect(tradeText).toContain('SPRITES TRACKER');
    expect(tradeText).toContain('Air: BASE');

    await page.locator('#shareButton').click();
    const shareText = await page.evaluate(() => navigator.clipboard.readText());
    const shareUrl = new URL(shareText);
    expect(decodeShare(shareUrl.searchParams.get('share'))).toEqual({
        owned: ['air_basic'],
        mastered: [],
    });
});

test('shows invalid shares and opens valid shares in view-only mode', async ({ page }) => {
    await page.goto('/?share=invalid!');
    await expect(page.locator('#sharedBanner')).toContainText('invalid');
    await expect(page.locator('#collectionTitle')).toHaveText('All sprites');

    const code = encodeShare({ owned: ['air_basic'], mastered: ['air_basic'] });
    expect(decodeShare(code)).toEqual({ owned: ['air_basic'], mastered: ['air_basic'] });
    await page.goto(`/?share=${code}`);
    await expect(page.locator('#collectionTitle')).toHaveText('Shared collection');
    await expect(page.locator('.sprite-card')).toHaveCount(1);
    await expect(page.locator('.sprite-art')).toHaveAttribute('role', 'img');
    await expect(page.locator('#shareButton')).toBeHidden();
});

test('handles empty exports and downloads valid PNGs for every board mode', async ({ page }) => {
    await page.locator('#exportToggle').click();
    await page.locator('[data-export="collected"]').click();
    await expect(page.locator('.toast-error')).toContainText('Collect a sprite');

    await page.locator('[data-id="air_basic"] .sprite-art').click();
    await page.locator('[data-id="air_basic"] .mastery-button').click();
    await page.locator('[data-id="water_basic"] .sprite-art').click();

    const widths = {};
    for (const mode of ['collected', 'missing', 'unmastered', 'mastered', 'trade']) {
        await page.locator('#exportToggle').click();
        const downloadPromise = page.waitForEvent('download');
        await page.locator(`[data-export="${mode}"]`).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe(`fnsprites-${{
            collected: 'collection',
            missing: 'missing',
            unmastered: 'to-master',
            mastered: 'mastered',
            trade: 'trade-board',
        }[mode]}.png`);

        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const png = Buffer.concat(chunks);
        expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        widths[mode] = png.readUInt32BE(16);
        expect(widths[mode]).toBeGreaterThan(200);
        expect(png.readUInt32BE(20)).toBeGreaterThan(200);
        await expect(page.locator('.toast-success')).toContainText('Image ready');
    }

    expect(widths.collected).toBeLessThan(widths.trade);
    expect(widths.unmastered).toBeLessThan(widths.trade);
    expect(widths.mastered).toBeLessThan(widths.trade);
});

test('has no horizontal overflow at a 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
    }));
    expect(dimensions).toEqual({ viewport: 390, page: 390, body: 390 });
});
