import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	CodeLensRequest,
	ColorPresentationRequest,
	DocumentColorRequest,
	DocumentLinkRequest,
	FoldingRangeRequest,
	InlayHintRequest,
	SelectionRangeRequest,
	SemanticTokensRequest,
	SignatureHelpRequest,
} from "vscode-languageserver-protocol"
import {
	toLspCodeLens,
	toLspColorInformation,
	toLspColorPresentation,
	toLspDocumentLink,
	toLspFoldingRange,
	toLspInlayHint,
	toLspSelectionRange,
	toLspSemanticTokens,
	toLspSignatureHelp,
} from "../utils/advancedConverters"
import {
	toVsCodePosition,
	toVsCodeRange,
	toVsCodeUri,
} from "../utils/converters"

export function registerAdvancedUIHandlers(connection: ProtocolConnection) {
	connection.onRequest(SignatureHelpRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const pos = toVsCodePosition(params.position)
		const help = await vscode.commands.executeCommand<vscode.SignatureHelp>(
			"vscode.executeSignatureHelpProvider",
			uri,
			pos,
			token,
		)

		if (!help) {
			return null
		}

		return toLspSignatureHelp(help)
	})

	connection.onRequest(InlayHintRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const range = toVsCodeRange(params.range)
		const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>(
			"vscode.executeInlayHintProvider",
			uri,
			range,
			token,
		)

		if (!hints || hints.length === 0) {
			return null
		}

		return hints.map(toLspInlayHint)
	})

	connection.onRequest(CodeLensRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
			"vscode.executeCodeLensProvider",
			uri,
			token,
		)

		if (!lenses || lenses.length === 0) {
			return null
		}

		return lenses.map(toLspCodeLens)
	})

	connection.onRequest(DocumentLinkRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>(
			"vscode.executeDocumentLinkProvider",
			uri,
			token,
		)

		if (!links || links.length === 0) {
			return null
		}

		return links.map(toLspDocumentLink)
	})

	connection.onRequest(DocumentColorRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const colors = await vscode.commands.executeCommand<
			vscode.ColorInformation[]
		>("vscode.executeDocumentColorProvider", uri, token)

		if (!colors || colors.length === 0) {
			return null
		}

		return colors.map(toLspColorInformation)
	})

	connection.onRequest(ColorPresentationRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const range = toVsCodeRange(params.range)
		const _color = new vscode.ThemeColor("terminal.ansiBlack") // Placeholder, not perfect as VS Code API uses ThemeColor/Color differently in presentation provider
		// The VS Code API for color presentation requires a `vscode.Color` object
		const lspColor = params.color
		const vsColor = new vscode.Color(
			lspColor.red,
			lspColor.green,
			lspColor.blue,
			lspColor.alpha,
		)
		const presentations = await vscode.commands.executeCommand<
			vscode.ColorPresentation[]
		>("vscode.executeColorPresentationProvider", vsColor, { uri, range }, token)

		if (!presentations || presentations.length === 0) {
			return null
		}

		return presentations.map(toLspColorPresentation)
	})

	connection.onRequest(FoldingRangeRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const ranges = await vscode.commands.executeCommand<vscode.FoldingRange[]>(
			"vscode.executeFoldingRangeProvider",
			uri,
			token,
		)

		if (!ranges || ranges.length === 0) {
			return null
		}

		return ranges.map(toLspFoldingRange)
	})

	connection.onRequest(SelectionRangeRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const positions = params.positions.map(toVsCodePosition)
		const ranges = await vscode.commands.executeCommand<
			vscode.SelectionRange[]
		>("vscode.executeSelectionRangeProvider", uri, positions, token)

		if (!ranges || ranges.length === 0) {
			return null
		}

		return ranges.map(toLspSelectionRange)
	})

	connection.onRequest(SemanticTokensRequest.type, async (params, token) => {
		const uri = toVsCodeUri(params.textDocument.uri)
		const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
			"vscode.provideDocumentSemanticTokens",
			uri,
			token,
		)

		if (!tokens) {
			return null
		}

		return toLspSemanticTokens(tokens)
	})
}
