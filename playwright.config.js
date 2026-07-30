import { defineConfig } from '@playwright/test';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const usesExternalServer = process.env.E2E_EXTERNAL_SERVER === '1';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://127.0.0.1:4187',
        headless: true,
        launchOptions: process.platform === 'win32' ? { executablePath: edgePath } : {},
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    webServer: usesExternalServer ? undefined : {
        command: 'node scripts/serve.mjs --port 4187',
        url: 'http://127.0.0.1:4187',
        reuseExistingServer: !process.env.CI,
        timeout: 15_000,
    },
});
