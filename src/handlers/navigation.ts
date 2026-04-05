import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	CompletionRequest,
	CompletionResolveRequest,
	DeclarationRequest,
	DefinitionRequest,
	DocumentHighlightRequest,
	DocumentSymbolRequest,
	HoverRequest,
	ImplementationRequest,
	ReferencesRequest,
	TypeDefinitionRequest,
	WorkspaceSymbolRequest,
} from "vscode-languageserver-protocol"
import {
	toLspCompletionItem,
	toLspDocumentHighlight,
	toLspDocumentSymbol,
	toLspHover,
	toLspLocation,
	toLspSymbolInformation,
	toVsCodePosition,
	toVsCodeUri,
} from "../utils/converters"

export function registerNavigationHandlers(connection: ProtocolConnection) {
	// textDocument/hover
	connection.onRequest(HoverRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
				"vscode.executeHoverProvider",
				uri,
				pos,
				token,
			)
			return toLspHover(hovers)
		} catch (err) {
			console.error(`Hover failed: ${err}`)
			return null
		}
	})

	// textDocument/completion
	connection.onRequest(CompletionRequest.method, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const completionList =
				await vscode.commands.executeCommand<vscode.CompletionList>(
					"vscode.executeCompletionItemProvider",
					uri,
					pos,
					params.context?.triggerCharacter,
					token,
				)

			if (!completionList) return null

			return {
				isIncomplete: completionList.isIncomplete,
				items: completionList.items.map(toLspCompletionItem),
			}
		} catch (err) {
			console.error(`Completion failed: ${err}`)
			return null
		}
	})

	// completionItem/resolve
	connection.onRequest(CompletionResolveRequest.type, (item) => {
		// VS Code executeCompletionItemProvider resolves details in the initial call,
		// so we usually just echo the item back.
		return item
	})

	// textDocument/definition
	connection.onRequest(DefinitionRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const locations = await vscode.commands.executeCommand<
				vscode.Location[] | vscode.LocationLink[]
			>("vscode.executeDefinitionProvider", uri, pos, token)

			if (!locations) return null

			// Map Location and LocationLink uniformly to Location
			return locations.map((loc) => {
				if ("targetUri" in loc) {
					return toLspLocation(
						new vscode.Location(
							loc.targetUri,
							loc.targetSelectionRange || loc.targetRange,
						),
					)
				}
				return toLspLocation(loc)
			})
		} catch (err) {
			console.error(`Definition failed: ${err}`)
			return null
		}
	})

	// textDocument/declaration
	connection.onRequest(DeclarationRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const locations = await vscode.commands.executeCommand<
				vscode.Location[] | vscode.LocationLink[]
			>("vscode.executeDeclarationProvider", uri, pos, token)

			if (!locations) return null

			return locations.map((loc) => {
				if ("targetUri" in loc) {
					return toLspLocation(
						new vscode.Location(
							loc.targetUri,
							loc.targetSelectionRange || loc.targetRange,
						),
					)
				}
				return toLspLocation(loc)
			})
		} catch (err) {
			console.error(`Declaration failed: ${err}`)
			return null
		}
	})

	// textDocument/typeDefinition
	connection.onRequest(TypeDefinitionRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const locations = await vscode.commands.executeCommand<
				vscode.Location[] | vscode.LocationLink[]
			>("vscode.executeTypeDefinitionProvider", uri, pos, token)

			if (!locations) return null

			return locations.map((loc) => {
				if ("targetUri" in loc) {
					return toLspLocation(
						new vscode.Location(
							loc.targetUri,
							loc.targetSelectionRange || loc.targetRange,
						),
					)
				}
				return toLspLocation(loc)
			})
		} catch (err) {
			console.error(`TypeDefinition failed: ${err}`)
			return null
		}
	})

	// textDocument/implementation
	connection.onRequest(ImplementationRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const locations = await vscode.commands.executeCommand<
				vscode.Location[] | vscode.LocationLink[]
			>("vscode.executeImplementationProvider", uri, pos, token)

			if (!locations) return null

			return locations.map((loc) => {
				if ("targetUri" in loc) {
					return toLspLocation(
						new vscode.Location(
							loc.targetUri,
							loc.targetSelectionRange || loc.targetRange,
						),
					)
				}
				return toLspLocation(loc)
			})
		} catch (err) {
			console.error(`Implementation failed: ${err}`)
			return null
		}
	})

	// textDocument/references
	connection.onRequest(ReferencesRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const locations = await vscode.commands.executeCommand<vscode.Location[]>(
				"vscode.executeReferenceProvider",
				uri,
				pos,
				token,
			)

			if (!locations) return null

			return locations.map(toLspLocation)
		} catch (err) {
			console.error(`References failed: ${err}`)
			return null
		}
	})

	// textDocument/documentHighlight
	connection.onRequest(DocumentHighlightRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const highlights = await vscode.commands.executeCommand<
				vscode.DocumentHighlight[]
			>("vscode.executeDocumentHighlights", uri, pos, token)

			if (!highlights) return null

			return highlights.map(toLspDocumentHighlight)
		} catch (err) {
			console.error(`DocumentHighlight failed: ${err}`)
			return null
		}
	})

	// textDocument/documentSymbol
	connection.onRequest(DocumentSymbolRequest.type, async (params, token) => {
		try {
			const uri = toVsCodeUri(params.textDocument.uri)
			const symbols = await vscode.commands.executeCommand<
				vscode.DocumentSymbol[] | vscode.SymbolInformation[]
			>("vscode.executeDocumentSymbolProvider", uri, token)

			if (!symbols) return null

			// Differentiate between DocumentSymbol and SymbolInformation (VSCode API returns union)
			if (symbols.length > 0 && "children" in symbols[0]) {
				return (symbols as vscode.DocumentSymbol[]).map(toLspDocumentSymbol)
			}
			return (symbols as vscode.SymbolInformation[]).map(toLspSymbolInformation)
		} catch (err) {
			console.error(`DocumentSymbol failed: ${err}`)
			return null
		}
	})

	// workspace/symbol
	connection.onRequest(WorkspaceSymbolRequest.type, async (params, token) => {
		try {
			const symbols = await vscode.commands.executeCommand<
				vscode.SymbolInformation[]
			>("vscode.executeWorkspaceSymbolProvider", params.query, token)

			if (!symbols) return null

			return symbols.map(toLspSymbolInformation)
		} catch (err) {
			console.error(`WorkspaceSymbol failed: ${err}`)
			return null
		}
	})
}
