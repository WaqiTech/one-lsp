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
		return `\\\\.\\pipe\\one-lsp-${id}`
	}
	return path.join(os.tmpdir(), `one-lsp-${id}.sock`)
}

export function activate(context: vscode.ExtensionContext) {
	console.log("Activating one-lsp unified proxy...")
	const socketPath = generateSocketPath()

	const outputChannel = vscode.window.createOutputChannel("one-lsp")
	context.subscriptions.push(outputChannel)
	outputChannel.appendLine(`one-lsp generated socket path: ${socketPath}`)

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
		sockInfoPath = path.join(dotVscode, "one-lsp.sockpath")
		fs.writeFileSync(sockInfoPath, socketPath, "utf8")
		outputChannel.appendLine(`Wrote socket path to workspace: ${sockInfoPath}`)

		if (os.platform() !== "win32") {
			executablePath = path.join(workspaceRoot, "one-lsp")
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
		if (os.platform() !== "win32") {
			try {
				fs.chmodSync(socketPath, 0o600)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				outputChannel.appendLine(
					`Failed to set socket permissions to 0600 at ${socketPath}: ${message}`,
				)
				console.error(
					`Failed to set socket permissions to 0600 at ${socketPath}: ${message}`,
				)
				server.close()
				return
			}
		}
		console.log(`one-lsp unified proxy listening on ${socketPath}`)
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
