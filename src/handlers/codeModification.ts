import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	DocumentFormattingRequest,
	DocumentOnTypeFormattingRequest,
	DocumentRangeFormattingRequest,
} from "vscode-languageserver-protocol"
import {
	toLspTextEdit,
	toVsCodePosition,
	toVsCodeRange,
	toVsCodeUri,
} from "../utils/converters"

export function registerCodeModificationHandlers(
	connection: ProtocolConnection,
) {
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
