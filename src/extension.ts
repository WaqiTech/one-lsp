import * as crypto from "node:crypto"
import * as fs from "node:fs"
import * as net from "node:net"
import * as os from "node:os"
import * as path from "node:path"
import * as vscode from "vscode"
import * as rpc from "vscode-jsonrpc/node"
import { createProtocolConnection } from "vscode-languageserver-protocol/node"
import { registerAdvancedUIHandlers } from "./handlers/advancedUI"
import { registerCodeModificationHandlers } from "./handlers/codeModification"
import { registerDocumentSyncHandlers } from "./handlers/documentSync"
import { registerHierarchyHandlers } from "./handlers/hierarchy"
import { registerLifecycleHandlers } from "./handlers/lifecycle"
import { registerNavigationHandlers } from "./handlers/navigation"
import { registerNotificationHandlers } from "./handlers/notifications"

function generateSocketPath(): string {
	const id = crypto.randomBytes(16).toString("hex")
	if (os.platform() === "win32") {
		return `\\\\.\\pipe\\unified-lsp-${id}`
	}
	return path.join(os.tmpdir(), `unified-lsp-${id}.sock`)
}

const socketPath = generateSocketPath()

export function activate(context: vscode.ExtensionContext) {
	console.log("Activating unified-lsp proxy...")

	const outputChannel = vscode.window.createOutputChannel("Unified LSP")
	context.subscriptions.push(outputChannel)
	outputChannel.appendLine(
		`Unified LSP Proxy generated socket path: ${socketPath}`,
	)

	// Write socket path to workspace for automatic discovery by bridge.js
	const workspaceFolders = vscode.workspace.workspaceFolders
	let sockInfoPath: string | undefined
	let executablePath: string | undefined
	if (workspaceFolders && workspaceFolders.length > 0) {
		const workspaceRoot = workspaceFolders[0].uri.fsPath
		const dotVscode = path.join(workspaceRoot, ".vscode")
		if (!fs.existsSync(dotVscode)) {
			fs.mkdirSync(dotVscode, { recursive: true })
		}
		sockInfoPath = path.join(dotVscode, "unified-lsp.sockpath")
		fs.writeFileSync(sockInfoPath, socketPath, "utf8")
		outputChannel.appendLine(`Wrote socket path to workspace: ${sockInfoPath}`)

		if (os.platform() !== "win32") {
			executablePath = path.join(workspaceRoot, "unified-lsp")
			const scriptContent = `#!/bin/sh\nexec nc -U "${socketPath}"\n`
			fs.writeFileSync(executablePath, scriptContent, { mode: 0o755 })
			outputChannel.appendLine(
				`Created executable proxy script: ${executablePath}`,
			)
		}
	}

	// Crucial: Clean up old socket files on Unix before binding
	if (os.platform() !== "win32" && fs.existsSync(socketPath)) {
		fs.unlinkSync(socketPath)
	}

	const server = net.createServer((socket) => {
		// net.Socket plugs directly into vscode-jsonrpc
		const connection = createProtocolConnection(
			new rpc.StreamMessageReader(socket),
			new rpc.StreamMessageWriter(socket),
		)

		// Map handlers here...
		registerLifecycleHandlers(connection)
		registerDocumentSyncHandlers(connection)
		registerNavigationHandlers(connection)
		registerCodeModificationHandlers(connection)
		registerAdvancedUIHandlers(connection)
		registerHierarchyHandlers(connection)
		registerNotificationHandlers(connection, context)

		connection.listen()
	})

	server.listen(socketPath, () => {
		console.log(`Unified LSP Proxy listening on ${socketPath}`)
	})

	context.subscriptions.push({
		dispose: () => {
			server.close()
			if (os.platform() !== "win32" && fs.existsSync(socketPath)) {
				fs.unlinkSync(socketPath)
			}
			if (sockInfoPath && fs.existsSync(sockInfoPath)) {
				fs.unlinkSync(sockInfoPath)
			}
			if (executablePath && fs.existsSync(executablePath)) {
				fs.unlinkSync(executablePath)
			}
		},
	})
}

export function deactivate() {}
