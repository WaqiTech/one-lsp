import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import { PublishDiagnosticsNotification } from "vscode-languageserver-protocol"
import { toLspDiagnosticSeverity, toLspRange } from "../utils/converters"

export function registerNotificationHandlers(
	connection: ProtocolConnection,
	context: vscode.ExtensionContext,
) {
	const diagnosticDisposable = vscode.languages.onDidChangeDiagnostics(
		(e: vscode.DiagnosticChangeEvent) => {
			for (const uri of e.uris) {
				// Fetch all current diagnostics for this specific file
				const vsDiagnostics = vscode.languages.getDiagnostics(uri)

				const lspDiagnostics = vsDiagnostics.map((d) => ({
					range: toLspRange(d.range),
					severity: toLspDiagnosticSeverity(d.severity),
					code: typeof d.code === "object" ? d.code.value : d.code,
					source: d.source,
					message: d.message,
				}))

				connection.sendNotification(PublishDiagnosticsNotification.type, {
					uri: uri.toString(),
					diagnostics: lspDiagnostics,
				})
			}
		},
	)

	context.subscriptions.push(diagnosticDisposable)
}
