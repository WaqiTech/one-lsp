import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	DidChangeTextDocumentNotification,
	DidCloseTextDocumentNotification,
	DidOpenTextDocumentNotification,
	DidSaveTextDocumentNotification,
	TextDocumentContentChangeEvent,
} from "vscode-languageserver-protocol"
import { toVsCodeRange } from "../utils/converters"

export function registerDocumentSyncHandlers(connection: ProtocolConnection) {
	// textDocument/didOpen
	connection.onNotification(
		DidOpenTextDocumentNotification.type,
		async (params) => {
			try {
				const uri = vscode.Uri.parse(params.textDocument.uri)
				await vscode.workspace.openTextDocument(uri)
			} catch (err) {
				console.error(`Failed to open document: ${err}`)
			}
		},
	)

	// textDocument/didChange
	connection.onNotification(
		DidChangeTextDocumentNotification.type,
		async (params) => {
			try {
				const uri = vscode.Uri.parse(params.textDocument.uri)
				const edit = new vscode.WorkspaceEdit()

				// Ensure we sequence the changes
				for (const change of params.contentChanges) {
					if (TextDocumentContentChangeEvent.isIncremental(change)) {
						const range = toVsCodeRange(change.range)
						edit.replace(uri, range, change.text)
					} else {
						// Full document sync fallback
						const doc = await vscode.workspace.openTextDocument(uri)
						const fullRange = new vscode.Range(0, 0, doc.lineCount, 0)
						edit.replace(uri, fullRange, change.text)
					}
				}

				await vscode.workspace.applyEdit(edit)
			} catch (err) {
				console.error(`Failed to apply document changes: ${err}`)
			}
		},
	)

	// textDocument/didClose
	connection.onNotification(DidCloseTextDocumentNotification.type, (params) => {
		// We typically don't force close the VS Code text document from here,
		// as the user might still have it open in the IDE.
		// We just acknowledge the LSP client is no longer tracking it.
		console.log(`Client stopped tracking document: ${params.textDocument.uri}`)
	})

	// textDocument/didSave
	connection.onNotification(
		DidSaveTextDocumentNotification.type,
		async (params) => {
			try {
				const uri = vscode.Uri.parse(params.textDocument.uri)
				const doc = await vscode.workspace.openTextDocument(uri)
				if (doc.isDirty) {
					await doc.save()
				}
			} catch (err) {
				console.error(`Failed to save document: ${err}`)
			}
		},
	)
}
