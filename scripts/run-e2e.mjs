import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4187;
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/serve.mjs', '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'inherit'],
});

server.stdout.pipe(process.stdout);

function waitForExit(child) {
    return new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
}

async function waitForServer(timeout = 15_000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        if (server.exitCode !== null) {
            throw new Error(`Test server exited before becoming ready (code ${server.exitCode}).`);
        }
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) return;
        } catch {
            // The server is still starting.
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Test server did not become ready within ${timeout}ms.`);
}

async function stopServer() {
    if (server.exitCode !== null) return;
    const exited = waitForExit(server);
    server.kill('SIGTERM');
    await Promise.race([
        exited,
        new Promise(resolve => setTimeout(resolve, 2_000)),
    ]);
    if (server.exitCode === null) server.kill('SIGKILL');
}

let exitCode;
try {
    await waitForServer();
    const playwrightCli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
    const tests = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
        cwd: root,
        env: { ...process.env, E2E_EXTERNAL_SERVER: '1' },
        stdio: 'inherit',
    });
    const result = await waitForExit(tests);
    exitCode = result.code ?? 1;
} finally {
    await stopServer();
}

process.exitCode = exitCode ?? 1;
