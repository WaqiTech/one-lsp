import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	CodeActionRequest,
	DocumentFormattingRequest,
	DocumentOnTypeFormattingRequest,
	DocumentRangeFormattingRequest,
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
