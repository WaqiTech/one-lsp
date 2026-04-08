#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');

function findSocket() {
    // 1. Check command line arguments (--socket=...)
    const arg = process.argv.find(a => a.startsWith('--socket='));
    if (arg) return arg.split('=')[1];

    // 2. Check environment variable
    if (process.env.ONE_LSP_SOCKET) {
        return process.env.ONE_LSP_SOCKET;
    }

    // 3. Walk up the directory tree to find .vscode/one-lsp.sockpath
    let currentDir = process.cwd();
    while (true) {
        const currentSockFile = path.join(currentDir, '.vscode', 'one-lsp.sockpath');
        if (fs.existsSync(currentSockFile)) {
            return fs.readFileSync(currentSockFile, 'utf8').trim();
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break; // reached root
        currentDir = parentDir;
    }

    return null;
}

const socketPath = findSocket();

if (!socketPath) {
    console.error('ERROR: Could not find one-lsp socket path.');
    console.error('Ensure you are running this within a VS Code workspace where the one-lsp extension is active,');
    console.error('or specify the socket manually via:');
    console.error('  --socket=/path/to/sock');
    console.error('  ONE_LSP_SOCKET=/path/to/sock environment variable.');
    process.exit(1);
}

const client = net.createConnection(socketPath, () => {
    // Pipe client's stdio directly to and from the socket
    process.stdin.pipe(client);
    client.pipe(process.stdout);
});

client.on('error', (err) => {
    console.error(`Failed to connect to one-lsp unified proxy at ${socketPath}: ${err.message}`);
    process.exit(1);
});
