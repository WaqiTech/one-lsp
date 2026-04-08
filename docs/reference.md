# **one-lsp: Technical Implementation Reference**

This document details the engineering choices, problem-solving strategies, and edge-case mitigations required to build `one-lsp`, a robust unified LSP-to-VS-Code proxy.

## **1. Transport & Framing Architecture**

### **Problem: Stdio vs. Extension Host Isolation**

External LSP clients typically expect to spawn a child process and communicate via stdio. However, VS Code extensions run inside an isolated Node.js Extension Host and cannot easily hijack their own stdio without disrupting VS Code's internal IPC.

### **Solution Choice: IPC Sockets (Unix Domain Sockets / Named Pipes)**

We decouple the transport layer using Inter-Process Communication (IPC) sockets. This provides low-latency, file-system-secured streaming.

1. **VS Code Extension (Server):** Uses the Node.js `net` module to create a server listening on a Unix Domain Socket (`/tmp/one-lsp.sock`) on Linux/macOS, or a Named Pipe (`\\.\pipe\one-lsp`) on Windows.  
2. **Bridge Script (Client-Side Proxy):** A tiny external script connects to this socket file and pipes `process.stdin` to the socket, and the socket to `process.stdout`.

### **Framing Implementation Detail**

Raw LSP over stdio requires HTTP-like headers (`Content-Length: ...\r\n\r\n`).

**Solution:** A Node.js `net.Socket` is a native Duplex stream. We can pass it directly into `vscode-jsonrpc/node`'s `StreamMessageReader` and `StreamMessageWriter`. The library handles the Content-Length framing natively over the socket connection.

**Server Implementation Specification:**

```typescript
import * as net from 'net';  
import * as os from 'os';  
import * as fs from 'fs';  
import * as path from 'path';
import * as crypto from 'crypto';
import * as rpc from 'vscode-jsonrpc/node';

// Generate a unique socket per instance to prevent collisions
function generateSocketPath(): string {
    const id = crypto.randomBytes(16).toString("hex");
    return os.platform() === 'win32'   
        ? `\\\\.\\pipe\\one-lsp-${id}`   
        : path.join(os.tmpdir(), `one-lsp-${id}.sock`);
}

const socketPath = generateSocketPath();

export function activate(context: vscode.ExtensionContext) {  
    // Write socket path to workspace for automatic discovery by bridge.js
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const sockInfoPath = path.join(workspaceFolders[0].uri.fsPath, ".vscode", "one-lsp.sockpath");
        fs.mkdirSync(path.dirname(sockInfoPath), { recursive: true });
        fs.writeFileSync(sockInfoPath, socketPath, "utf8");
    }

    // Crucial: Clean up old socket files on Unix before binding  
    if (os.platform() !== 'win32' && fs.existsSync(socketPath)) {  
        fs.unlinkSync(socketPath);  
    }

    const server = net.createServer((socket) => {  
        // net.Socket plugs directly into vscode-jsonrpc  
        const connection = rpc.createMessageConnection(  
            new rpc.StreamMessageReader(socket),  
            new rpc.StreamMessageWriter(socket)  
        );

        // Map handlers here...  
        // connection.onRequest(...)

        connection.listen();  
    });

    server.listen(socketPath);  
}
```

**Client Bridge (`bridge.js` spawned by LSP client):**

```javascript
const net = require('net');  
const os = require('os');  
const fs = require('fs');
const path = require('path');

// 1. Env Var -> 2. CLI Arg -> 3. Auto-discover from workspace
function findSocket() {
    if (process.env.ONE_LSP_SOCKET) return process.env.ONE_LSP_SOCKET;
    
    let currentDir = process.cwd();
    while (true) {
        const sockFile = path.join(currentDir, '.vscode', 'one-lsp.sockpath');
        if (fs.existsSync(sockFile)) return fs.readFileSync(sockFile, 'utf8').trim();
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
    }
    return null;
}

const socketPath = findSocket();

const client = net.createConnection(socketPath, () => {  
    // Pipe client's stdio directly to and from the socket  
    process.stdin.pipe(client);  
    client.pipe(process.stdout);  
});


client.on('error', (err) => {  
    console.error(`Failed to connect to one-lsp unified proxy: ${err.message}`);  
    process.exit(1);  
});
```

## **2. Server Lifecycle & Capabilities Negotiation**

### **Problem: Discoverability**

When the LSP client connects, it sends an `initialize` request. If the proxy does not respond with exact `ServerCapabilities`, the client will not send subsequent requests (like hover or completions).

### **Solution: Hardcoded Aggregated Capabilities**

Because VS Code dynamically routes requests to underlying providers, our proxy technically supports *everything* VS Code supports. We must return a comprehensive `ServerCapabilities` object.

**Implementation Specification for `initialize` response:**

```typescript
connection.onRequest(InitializeRequest.type, (params: InitializeParams): InitializeResult => {  
    return {  
        capabilities: {  
            textDocumentSync: TextDocumentSyncKind.Incremental,  
            completionProvider: {  
                resolveProvider: false,  
                triggerCharacters: ['.', ':', '>', '/', '"', "'"]  
            },  
            hoverProvider: true,  
            definitionProvider: true,  
            referencesProvider: true,  
            documentSymbolProvider: true,  
            workspaceSymbolProvider: true,  
            codeActionProvider: true,  
            renameProvider: true,  
            documentFormattingProvider: true  
        }  
    };  
});
```

## **3. Concurrency & Request Cancellation**

### **Problem: UI Thread Blocking**

LSP clients frequently request completions and hovers as the document changes. If the document state changes rapidly, the client will send `$/cancelRequest` for older, pending requests. If the proxy ignores these cancellations, it will flood the VS Code Extension Host, causing massive CPU spikes and UI lag.

### **Solution: Native CancellationToken Mapping**

VS Code's command execution (`vscode.commands.executeCommand`) accepts cancellation tokens, but they are normally hidden in the signature. The `vscode-jsonrpc` library inherently tracks `$/cancelRequest` payload IDs and exposes a `CancellationToken` to the handler.

**Implementation Rule:** *Always* pass the JSON-RPC token to the VS Code API.

```typescript
// The 'token' parameter is automatically injected and managed by vscode-jsonrpc  
connection.onRequest(HoverRequest.type, async (params, token) => {  
    const uri = toVsCodeUri(params.textDocument.uri);  
    const pos = toVsCodePosition(params.position);  
      
    // Pass the token as the final argument to prevent abandoned command execution  
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(  
        'vscode.executeHoverProvider', uri, pos, token  
    );  
    // ...  
});
```

## **4. State Synchronization Strategies**

### **Problem: Document Desync**

The underlying VS Code LSPs (like `tsserver` or `pylsp`) read from VS Code's internal text buffer, not from the file system. If the LSP client makes an internal edit and asks for autocomplete without telling VS Code, the offsets will be wrong, and the completion will fail.

### **Solution: WorkspaceEdit Shadowing**

When the client sends `textDocument/didChange`, we must physically alter the VS Code editor's state without saving the file (leaving it "dirty").

**Edge Case Mitigation: Version Tracking**

LSP `didChange` events include version numbers. VS Code documents also have version numbers. You must ensure you process `didChange` events in sequential order, or you will corrupt VS Code's buffer.

```typescript
connection.onNotification(DidChangeTextDocumentNotification.type, async (params) => {  
    const uri = vscode.Uri.parse(params.textDocument.uri);  
    const edit = new vscode.WorkspaceEdit();  
      
    // LSP allows batch incremental changes in a single notification  
    for (const change of params.contentChanges) {  
        if (TextDocumentContentChangeEvent.isIncremental(change)) {  
            const range = toVsCodeRange(change.range);  
            edit.replace(uri, range, change.text);  
        } else {  
            // Full document sync fallback  
            const doc = await vscode.workspace.openTextDocument(uri);  
            const fullRange = new vscode.Range(0, 0, doc.lineCount, 0);  
            edit.replace(uri, fullRange, change.text);  
        }  
    }  
    await vscode.workspace.applyEdit(edit);  
});
```

## **5. Aggregation & Data Translation Details**

### **Problem 1: Merging Multi-Provider Results (e.g., Hover)**

VS Code's `executeHoverProvider` returns an array of `vscode.Hover` objects because multiple extensions might provide info for the same token (e.g., TypeScript LSP + ESLint extension). The LSP spec expects a single Hover object.

**Solution: Markdown Concatenation**

Extract the `MarkdownString` or string from every returned hover item, map them into a single markdown block separated by horizontal rules (`---`), and return a unified `MarkupContent` object.

### **Problem 2: Enum Mismatches (Crucial Failure Point)**

VS Code API Enums (like `vscode.SymbolKind` or `vscode.CompletionItemKind`) do **not** have a guaranteed 1:1 integer mapping to the official LSP specification integers.

**Solution: Strict Mapping Functions**

You cannot cast the integers. You must write explicit switch statements or mapping objects for `SymbolKind`, `CompletionItemKind`, and `DiagnosticSeverity`.

*Example: CompletionItemKind Mapping*

```typescript
function toLspCompletionItemKind(vsKind: vscode.CompletionItemKind): lsp.CompletionItemKind {  
    switch (vsKind) {  
        case vscode.CompletionItemKind.Method: return lsp.CompletionItemKind.Method;  
        case vscode.CompletionItemKind.Function: return lsp.CompletionItemKind.Function;  
        case vscode.CompletionItemKind.Constructor: return lsp.CompletionItemKind.Constructor;  
        case vscode.CompletionItemKind.Field: return lsp.CompletionItemKind.Field;  
        case vscode.CompletionItemKind.Variable: return lsp.CompletionItemKind.Variable;  
        case vscode.CompletionItemKind.Class: return lsp.CompletionItemKind.Class;  
        // ... exhaustive mapping required. Fallback to Text.  
        default: return lsp.CompletionItemKind.Text;  
    }  
}
```

### **Problem 3: 0-Indexed vs. 1-Indexed Discrepancies**

* **Positions:** Both LSP and VS Code use 0-indexed lines and characters. No arithmetic translation is needed for standard UTF-8 characters.  
	* **UTF-16 Surrogate Pairs:** VS Code API string lengths and characters map to UTF-16 code units (like JS strings). The LSP spec defaults to UTF-16 but allows negotiating UTF-8. **Solution:** Ensure your proxy strictly negotiates `positionEncoding: 'utf-16'` during the `initialize` handshake so no complex offset arithmetic is required.

### **Problem 4: File Operations in WorkspaceEdit**

* **Issue:** When a VS Code extension returns a `WorkspaceEdit` (e.g., for a rename or code action), that edit might contain file creations, renames, or deletions in addition to text edits. However, VS Code's public extension API only exposes text edits via the `edit.entries()` method and completely hides these file operations.
* **Solution/Limitation:** Because there is no stable public API to extract `CreateFile`, `RenameFile`, or `DeleteFile` operations from a `vscode.WorkspaceEdit` without resorting to undocumented internal properties (like `_allEntries()`), `one-lsp` intentionally limits support to text modifications. Any file operations included in an edit are currently dropped to ensure the proxy's long-term stability and type safety.

## **6. Diagnostic Streaming (Push Notifications)**

### **Problem: Server-to-Client Unsolicited Messages**

Unlike hovers or definitions (Request/Response), diagnostics (linting/errors) are continuously pushed by the server to the client whenever the document state changes.

### **Solution: VS Code Event Listeners**

You must bind to `vscode.languages.onDidChangeDiagnostics`. When VS Code aggregates new diagnostics, your proxy must filter them by URI and push a `textDocument/publishDiagnostics` notification to the LSP client.

```typescript
vscode.languages.onDidChangeDiagnostics((e: vscode.DiagnosticChangeEvent) => {  
    for (const uri of e.uris) {  
        // Fetch all current diagnostics for this specific file  
        const vsDiagnostics = vscode.languages.getDiagnostics(uri);  
          
        const lspDiagnostics = vsDiagnostics.map(d => ({  
            range: toLspRange(d.range),  
            severity: toLspDiagnosticSeverity(d.severity),  
            code: typeof d.code === 'object' ? d.code.value : d.code,  
            source: d.source,  
            message: d.message  
        }));

        connection.sendNotification(PublishDiagnosticsNotification.type, {  
            uri: uri.toString(),  
            diagnostics: lspDiagnostics  
        });  
    }  
});
```

## **7. Security & File System Boundaries**

**Problem:** Exposing internal IDE context over IPC.

**Solution:** By utilizing Unix Domain Sockets and Named Pipes, the operating system's native file-permission model inherently protects the proxy. Ensure that on Unix systems, the socket file is created with restricted permissions (e.g., `0600`) so only the user running VS Code can connect to the LSP client.
