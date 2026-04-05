import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	CodeActionRequest,
	DocumentFormattingRequest,
	DocumentOnTypeFormattingRequest,
	DocumentRangeFormattingRequest,
	PrepareRenameRequest,
	RenameRequest,
} from "vscode-languageserver-protocol"
import {
	toLspCodeAction,
	toLspTextEdit,
	toLspWorkspaceEdit,
	toVsCodePosition,
	toVsCodeRange,
	toVsCodeUri,
} from "../utils/converters"

export function registerCodeModificationHandlers(
	connection: ProtocolConnection,
) {
	connection.onRequest(RenameRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const pos = toVsCodePosition(params.position)
		const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
			"vscode.executeDocumentRenameProvider",
			uri,
			pos,
			params.newName,
			token,
		)

		if (!edit) {
			return null
		}

		return toLspWorkspaceEdit(edit)
	})

	connection.onRequest(PrepareRenameRequest.type, async (params, _token) => {
		const _uri = toVsCodeUri(params.textDocument.uri)
		const _pos = toVsCodePosition(params.position)
		// VS Code does not have a direct command for prepare rename.
		// However, returning null indicates to the client that we can't do it,
		// or we can just return a valid range if we can find the word at position.
		// For simplicity and correctness without a direct API, returning null falls back
		// to the client's default behavior (usually renaming the word under cursor).
		return null
	})

	connection.onRequest(CodeActionRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const range = toVsCodeRange(params.range)
		const actions = await vscode.commands.executeCommand<
			(vscode.CodeAction | vscode.Command)[]
		>("vscode.executeCodeActionProvider", uri, range, undefined, token)

		if (!actions || actions.length === 0) {
			return null
		}

		return actions.map(toLspCodeAction)
	})

	connection.onRequest(
		DocumentFormattingRequest.type,
		async (params, token) => {
			const uri = toVsCodeUri(params.textDocument.uri)
			const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
				"vscode.executeFormatDocumentProvider",
				uri,
				params.options,
				token,
			)

			if (!edits || edits.length === 0) {
				return null
			}

			return edits.map(toLspTextEdit)
		},
	)

	connection.onRequest(
		DocumentRangeFormattingRequest.type,
		async (params, token) => {
			const uri = toVsCodeUri(params.textDocument.uri)
			const range = toVsCodeRange(params.range)
			const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
				"vscode.executeFormatRangeProvider",
				uri,
				range,
				params.options,
				token,
			)

			if (!edits || edits.length === 0) {
				return null
			}

			return edits.map(toLspTextEdit)
		},
	)

	connection.onRequest(
		DocumentOnTypeFormattingRequest.type,
		async (params, token) => {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
				"vscode.executeFormatOnTypeProvider",
				uri,
				pos,
				params.ch,
				params.options,
				token,
			)

			if (!edits || edits.length === 0) {
				return null
			}

			return edits.map(toLspTextEdit)
		},
	)
}
