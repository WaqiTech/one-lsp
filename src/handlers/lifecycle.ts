import {
	ExitNotification,
	InitializedNotification,
	type InitializeParams,
	InitializeRequest,
	type InitializeResult,
	type ProtocolConnection,
	ShutdownRequest,
	TextDocumentSyncKind,
} from "vscode-languageserver-protocol"

export function registerLifecycleHandlers(connection: ProtocolConnection) {
	let isInitialized = false
	let isShuttingDown = false

	// 1. initialize
	connection.onRequest(
		InitializeRequest.type,
		(_params: InitializeParams): InitializeResult => {
			isInitialized = true
			console.log("Received initialize request from client")

			return {
				capabilities: {
					textDocumentSync: TextDocumentSyncKind.Incremental,
					completionProvider: {
						resolveProvider: false,
						triggerCharacters: [".", ":", ">", "/", '"', "'"],
					},
					hoverProvider: true,
					definitionProvider: true,
					referencesProvider: true,
					documentSymbolProvider: true,
					workspaceSymbolProvider: true,
					codeActionProvider: true,
					renameProvider: { prepareProvider: true },
					documentFormattingProvider: true,
					documentRangeFormattingProvider: true,
					documentOnTypeFormattingProvider: { firstTriggerCharacter: ";" },
					signatureHelpProvider: { triggerCharacters: ["(", ","] },
					inlayHintProvider: { resolveProvider: false },
					codeLensProvider: { resolveProvider: false },
					documentLinkProvider: { resolveProvider: false },
					colorProvider: true,
					foldingRangeProvider: true,
					selectionRangeProvider: true,
					semanticTokensProvider: {
						legend: {
							tokenTypes: [
								"namespace",
								"class",
								"enum",
								"interface",
								"struct",
								"typeParameter",
								"type",
								"parameter",
								"variable",
								"property",
								"enumMember",
								"decorator",
								"event",
								"function",
								"method",
								"macro",
								"label",
								"comment",
								"string",
								"keyword",
								"number",
								"regexp",
								"operator",
							],
							tokenModifiers: [
								"declaration",
								"definition",
								"readonly",
								"static",
								"deprecated",
								"abstract",
								"async",
								"modification",
								"documentation",
								"defaultLibrary",
							],
						},
						full: true,
					},
					callHierarchyProvider: true,
					typeHierarchyProvider: true,
				},
				serverInfo: {
					name: "one-lsp",
					version: "0.0.1",
				},
			}
		},
	)

	// 2. initialized
	connection.onNotification(InitializedNotification.type, () => {
		if (!isInitialized) {
			console.warn(
				"Received initialized notification before initialize request",
			)
		}
		console.log("Client confirmed initialization")
	})

	// 3. shutdown
	connection.onRequest(ShutdownRequest.type, () => {
		isShuttingDown = true
		console.log("Client requested shutdown")
		return null
	})

	// 4. exit
	connection.onNotification(ExitNotification.type, () => {
		console.log(`Client exited (graceful shutdown: ${isShuttingDown})`)
		// In a normal LSP server, we would call process.exit() here.
		// However, since we are running inside the VS Code Extension Host,
		// we must NOT call process.exit() as it would crash the entire host.
		// Instead, we just dispose of the connection.
		connection.dispose()
	})
}
