# one-lsp

## Abstract

`one-lsp` is a Visual Studio Code extension that acts as a unified LSP proxy, allowing external text editors (such as Neovim or Helix) to connect to and use Visual Studio Code's active language features via a local socket.

## Features

The proxy exposes selected language features from VS Code's current editor state, including completions, hovers, diagnostics, definitions, symbols, and formatting. Features that cannot be implemented faithfully through VS Code's public extension API, such as rename and code actions with file operations, are intentionally not advertised.

## Installation

Install the `one-lsp` extension in Visual Studio Code. Opening a workspace directory activates the extension and automatically generates a unique socket path for that session.

## Usage

When the extension activates, it creates a `.vscode/one-lsp.sockpath` file in your workspace containing the active socket path.

On Unix-like systems (Linux/macOS), the extension also automatically generates an executable script named `one-lsp` in your workspace root. You can point your external editor's Language Server Protocol client directly to this script:

```bash
./one-lsp
```

Alternatively, you can manually pipe standard input and output using a lightweight tool like Netcat and the socket path file:

```bash
nc -U $(< .vscode/one-lsp.sockpath)
```

You can also use the included `bridge.js` script, which automatically locates the correct socket file for your workspace and establishes the connection via `ONE_LSP_SOCKET` or `.vscode/one-lsp.sockpath`.

## Documentation

For technical specifications and proxy architecture details, read the [Technical Implementation Reference](docs/reference.md).
