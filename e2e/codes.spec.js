import { expect, test } from '@playwright/test';
import { codes } from '../src/generated/codes.js';

test.describe('Lobby Hacks (Codes)', () => {
    test('renders lobby codes and supports redemption and copy workflows', async ({ page }) => {
        await page.goto('/');

        // Verify codes button exists on home page
        const codesButton = page.locator('#codesButton');
        await expect(codesButton).toBeVisible();

        // Navigate to codes page
        await codesButton.click();
        await expect(page).toHaveURL(/codes(\.html)?/);
        await expect(page.locator('h1')).toHaveText('Current Lobby Codes');

        // Uncheck hide redeemed first so we can verify button state in place
        const hideRedeemed = page.locator('#hideRedeemedToggle');
        await expect(hideRedeemed).toBeChecked();
        await hideRedeemed.setChecked(false, { force: true });
        await expect(hideRedeemed).not.toBeChecked();

        // Check codes list rendered
        const rows = page.locator('.code-row');
        await expect(rows).toHaveCount(codes.length);

        // Click first code's redeem button
        const firstRow = rows.first();
        const firstCode = codes[0].code;
        const redeemBtn = firstRow.locator('.action-primary');
        await expect(redeemBtn).toHaveText('Mark Redeemed');

        await redeemBtn.click();
        await expect(firstRow).toHaveClass(/is-redeemed/);
        await expect(firstRow.locator('.action-redeemed')).toHaveText('Redeemed');

        // Test hide redeemed filter hides the redeemed code
        await hideRedeemed.setChecked(true, { force: true });
        await expect(hideRedeemed).toBeChecked();
        await expect(page.locator(`[data-code="${firstCode}"]`)).toHaveCount(0);

        // Uncheck hide redeemed again to continue tests
        await hideRedeemed.setChecked(false, { force: true });
        await expect(page.locator(`[data-code="${firstCode}"]`)).toBeVisible();

        // Test search filter
        const searchInput = page.locator('#searchCodes');
        await searchInput.fill(firstCode);
        await expect(page.locator('.code-row')).toHaveCount(1);
        await searchInput.clear();

        // Test Redeem All / Unredeem All
        const unredeemAllBtn = page.locator('#unredeemAllBtn');
        await unredeemAllBtn.click();
        await expect(page.locator('.code-row.is-redeemed')).toHaveCount(0);

        const redeemAllBtn = page.locator('#redeemAllBtn');
        await redeemAllBtn.click();
        await expect(page.locator('.code-row.is-redeemed')).toHaveCount(codes.length);

        // Return to tracker
        const returnBtn = page.locator('#returnButton');
        await returnBtn.click();
        await expect(page).toHaveURL(/\/(index\.html)?$/);
    });
});
