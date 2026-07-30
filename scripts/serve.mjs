import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portArgument = process.argv.indexOf('--port');
const hasExplicitPort = portArgument !== -1 || Boolean(process.env.PORT);
const requestedPort = Number(portArgument === -1 ? process.env.PORT || 4173 : process.argv[portArgument + 1]);
const host = '127.0.0.1';
if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65_535) {
    throw new TypeError(`Invalid port: ${requestedPort}`);
}
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
};

function resolveRequestPath(url) {
    const pathname = decodeURIComponent(new URL(url, `http://${host}`).pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const resolved = path.resolve(root, relativePath);
    return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

const server = http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
        return;
    }

    let filePath;
    try {
        filePath = resolveRequestPath(request.url);
    } catch {
        response.writeHead(400).end('Bad request');
        return;
    }
    if (!filePath) {
        response.writeHead(403).end('Forbidden');
        return;
    }

    try {
        const file = await stat(filePath);
        if (!file.isFile()) throw new Error('Not a file');
        response.writeHead(200, {
            'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': file.size,
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff',
        });
        if (request.method === 'HEAD') {
            response.end();
        } else {
            const stream = createReadStream(filePath);
            stream.on('error', () => response.destroy());
            stream.pipe(response);
        }
    } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});

let activePort = requestedPort;
server.on('error', error => {
    if (error.code === 'EADDRINUSE' && !hasExplicitPort && activePort < requestedPort + 10) {
        activePort += 1;
        server.listen(activePort, host);
        return;
    }

    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${activePort} is already in use. Stop that server or choose another with --port.`);
    } else {
        console.error(`Could not start the development server: ${error.message}`);
    }
    process.exitCode = 1;
});

server.listen(activePort, host, () => {
    console.log(`Sprites Tracker running at http://${host}:${activePort}/`);
});

function shutdown() {
    server.closeAllConnections();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1_000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
