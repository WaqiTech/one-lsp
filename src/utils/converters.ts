import * as vscode from "vscode"
import type {
	CodeAction,
	CodeActionKind,
	Command,
	CompletionItem,
	DocumentHighlight,
	DocumentSymbol,
	Hover,
	Location,
	Position,
	Range,
	SymbolInformation,
	TextEdit,
	WorkspaceEdit,
} from "vscode-languageserver-protocol"
import {
	CompletionItemKind,
	DiagnosticSeverity,
	DocumentHighlightKind,
	MarkupKind,
	SymbolKind,
} from "vscode-languageserver-protocol"

export function toVsCodeUri(uri: string): vscode.Uri {
	return vscode.Uri.parse(uri)
}

export function toVsCodePosition(position: Position): vscode.Position {
	return new vscode.Position(position.line, position.character)
}

export function toVsCodeRange(range: Range): vscode.Range {
	return new vscode.Range(
		toVsCodePosition(range.start),
		toVsCodePosition(range.end),
	)
}

export function toLspPosition(position: vscode.Position): Position {
	return {
		line: position.line,
		character: position.character,
	}
}

export function toLspRange(range: vscode.Range): Range {
	return {
		start: toLspPosition(range.start),
		end: toLspPosition(range.end),
	}
}

export function toLspLocation(location: vscode.Location): Location {
	return {
		uri: location.uri.toString(),
		range: toLspRange(location.range),
	}
}

export function toLspHover(hovers: vscode.Hover[]): Hover | null {
	if (!hovers || hovers.length === 0) {
		return null
	}

	const contents: string[] = []

	for (const hover of hovers) {
		for (const content of hover.contents) {
			if (typeof content === "string") {
				contents.push(content)
			} else {
				contents.push(content.value)
			}
		}
	}

	if (contents.length === 0) {
		return null
	}

	return {
		contents: {
			kind: MarkupKind.Markdown,
			value: contents.join("\n\n---\n\n"),
		},
		range: hovers[0].range ? toLspRange(hovers[0].range) : undefined,
	}
}

export function toLspCompletionItemKind(
	vsKind: vscode.CompletionItemKind,
): CompletionItemKind {
	switch (vsKind) {
		case vscode.CompletionItemKind.Method:
			return CompletionItemKind.Method
		case vscode.CompletionItemKind.Function:
			return CompletionItemKind.Function
		case vscode.CompletionItemKind.Constructor:
			return CompletionItemKind.Constructor
		case vscode.CompletionItemKind.Field:
			return CompletionItemKind.Field
		case vscode.CompletionItemKind.Variable:
			return CompletionItemKind.Variable
		case vscode.CompletionItemKind.Class:
			return CompletionItemKind.Class
		case vscode.CompletionItemKind.Interface:
			return CompletionItemKind.Interface
		case vscode.CompletionItemKind.Module:
			return CompletionItemKind.Module
		case vscode.CompletionItemKind.Property:
			return CompletionItemKind.Property
		case vscode.CompletionItemKind.Unit:
			return CompletionItemKind.Unit
		case vscode.CompletionItemKind.Value:
			return CompletionItemKind.Value
		case vscode.CompletionItemKind.Enum:
			return CompletionItemKind.Enum
		case vscode.CompletionItemKind.Keyword:
			return CompletionItemKind.Keyword
		case vscode.CompletionItemKind.Snippet:
			return CompletionItemKind.Snippet
		case vscode.CompletionItemKind.Color:
			return CompletionItemKind.Color
		case vscode.CompletionItemKind.File:
			return CompletionItemKind.File
		case vscode.CompletionItemKind.Reference:
			return CompletionItemKind.Reference
		case vscode.CompletionItemKind.Folder:
			return CompletionItemKind.Folder
		case vscode.CompletionItemKind.EnumMember:
			return CompletionItemKind.EnumMember
		case vscode.CompletionItemKind.Constant:
			return CompletionItemKind.Constant
		case vscode.CompletionItemKind.Struct:
			return CompletionItemKind.Struct
		case vscode.CompletionItemKind.Event:
			return CompletionItemKind.Event
		case vscode.CompletionItemKind.Operator:
			return CompletionItemKind.Operator
		case vscode.CompletionItemKind.TypeParameter:
			return CompletionItemKind.TypeParameter
		default:
			return CompletionItemKind.Text
	}
}

export function toLspCompletionItem(
	item: vscode.CompletionItem,
): CompletionItem {
	return {
		label: typeof item.label === "string" ? item.label : item.label.label,
		kind:
			item.kind !== undefined ? toLspCompletionItemKind(item.kind) : undefined,
		detail: item.detail,
		documentation:
			typeof item.documentation === "string"
				? item.documentation
				: item.documentation?.value,
		sortText: item.sortText,
		filterText: item.filterText,
		insertText:
			typeof item.insertText === "string"
				? item.insertText
				: item.insertText?.value,
	}
}

export function toLspDocumentHighlightKind(
	vsKind: vscode.DocumentHighlightKind | undefined,
): DocumentHighlightKind | undefined {
	if (vsKind === undefined) {
		return undefined
	}
	switch (vsKind) {
		case vscode.DocumentHighlightKind.Text:
			return DocumentHighlightKind.Text
		case vscode.DocumentHighlightKind.Read:
			return DocumentHighlightKind.Read
		case vscode.DocumentHighlightKind.Write:
			return DocumentHighlightKind.Write
		default:
			return DocumentHighlightKind.Text
	}
}

export function toLspDocumentHighlight(
	highlight: vscode.DocumentHighlight,
): DocumentHighlight {
	return {
		range: toLspRange(highlight.range),
		kind: toLspDocumentHighlightKind(highlight.kind),
	}
}

export function toLspSymbolKind(vsKind: vscode.SymbolKind): SymbolKind {
	switch (vsKind) {
		case vscode.SymbolKind.File:
			return SymbolKind.File
		case vscode.SymbolKind.Module:
			return SymbolKind.Module
		case vscode.SymbolKind.Namespace:
			return SymbolKind.Namespace
		case vscode.SymbolKind.Package:
			return SymbolKind.Package
		case vscode.SymbolKind.Class:
			return SymbolKind.Class
		case vscode.SymbolKind.Method:
			return SymbolKind.Method
		case vscode.SymbolKind.Property:
			return SymbolKind.Property
		case vscode.SymbolKind.Field:
			return SymbolKind.Field
		case vscode.SymbolKind.Constructor:
			return SymbolKind.Constructor
		case vscode.SymbolKind.Enum:
			return SymbolKind.Enum
		case vscode.SymbolKind.Interface:
			return SymbolKind.Interface
		case vscode.SymbolKind.Function:
			return SymbolKind.Function
		case vscode.SymbolKind.Variable:
			return SymbolKind.Variable
		case vscode.SymbolKind.Constant:
			return SymbolKind.Constant
		case vscode.SymbolKind.String:
			return SymbolKind.String
		case vscode.SymbolKind.Number:
			return SymbolKind.Number
		case vscode.SymbolKind.Boolean:
			return SymbolKind.Boolean
		case vscode.SymbolKind.Array:
			return SymbolKind.Array
		case vscode.SymbolKind.Object:
			return SymbolKind.Object
		case vscode.SymbolKind.Key:
			return SymbolKind.Key
		case vscode.SymbolKind.Null:
			return SymbolKind.Null
		case vscode.SymbolKind.EnumMember:
			return SymbolKind.EnumMember
		case vscode.SymbolKind.Struct:
			return SymbolKind.Struct
		case vscode.SymbolKind.Event:
			return SymbolKind.Event
		case vscode.SymbolKind.Operator:
			return SymbolKind.Operator
		case vscode.SymbolKind.TypeParameter:
			return SymbolKind.TypeParameter
		default:
			return SymbolKind.File
	}
}

export function toVsCodeSymbolKind(lspKind: SymbolKind): vscode.SymbolKind {
	switch (lspKind) {
		case SymbolKind.File:
			return vscode.SymbolKind.File
		case SymbolKind.Module:
			return vscode.SymbolKind.Module
		case SymbolKind.Namespace:
			return vscode.SymbolKind.Namespace
		case SymbolKind.Package:
			return vscode.SymbolKind.Package
		case SymbolKind.Class:
			return vscode.SymbolKind.Class
		case SymbolKind.Method:
			return vscode.SymbolKind.Method
		case SymbolKind.Property:
			return vscode.SymbolKind.Property
		case SymbolKind.Field:
			return vscode.SymbolKind.Field
		case SymbolKind.Constructor:
			return vscode.SymbolKind.Constructor
		case SymbolKind.Enum:
			return vscode.SymbolKind.Enum
		case SymbolKind.Interface:
			return vscode.SymbolKind.Interface
		case SymbolKind.Function:
			return vscode.SymbolKind.Function
		case SymbolKind.Variable:
			return vscode.SymbolKind.Variable
		case SymbolKind.Constant:
			return vscode.SymbolKind.Constant
		case SymbolKind.String:
			return vscode.SymbolKind.String
		case SymbolKind.Number:
			return vscode.SymbolKind.Number
		case SymbolKind.Boolean:
			return vscode.SymbolKind.Boolean
		case SymbolKind.Array:
			return vscode.SymbolKind.Array
		case SymbolKind.Object:
			return vscode.SymbolKind.Object
		case SymbolKind.Key:
			return vscode.SymbolKind.Key
		case SymbolKind.Null:
			return vscode.SymbolKind.Null
		case SymbolKind.EnumMember:
			return vscode.SymbolKind.EnumMember
		case SymbolKind.Struct:
			return vscode.SymbolKind.Struct
		case SymbolKind.Event:
			return vscode.SymbolKind.Event
		case SymbolKind.Operator:
			return vscode.SymbolKind.Operator
		case SymbolKind.TypeParameter:
			return vscode.SymbolKind.TypeParameter
		default:
			return vscode.SymbolKind.Object
	}
}

export function toLspDocumentSymbol(
	symbol: vscode.DocumentSymbol,
): DocumentSymbol {
	return {
		name: symbol.name,
		detail: symbol.detail,
		kind: toLspSymbolKind(symbol.kind),
		range: toLspRange(symbol.range),
		selectionRange: toLspRange(symbol.selectionRange),
		children: symbol.children?.map(toLspDocumentSymbol),
	}
}

export function toLspSymbolInformation(
	symbol: vscode.SymbolInformation,
): SymbolInformation {
	return {
		name: symbol.name,
		kind: toLspSymbolKind(symbol.kind),
		location: toLspLocation(symbol.location),
		containerName: symbol.containerName,
	}
}

export function toLspTextEdit(edit: vscode.TextEdit): TextEdit {
	return {
		range: toLspRange(edit.range),
		newText: edit.newText,
	}
}

export function toLspWorkspaceEdit(edit: vscode.WorkspaceEdit): WorkspaceEdit {
	const changes: { [uri: string]: TextEdit[] } = {}
	for (const [uri, textEdits] of edit.entries()) {
		changes[uri.toString()] = textEdits.map(toLspTextEdit)
	}
	return { changes }
}

export function toLspCodeAction(
	action: vscode.CodeAction | vscode.Command,
): CodeAction | Command {
	if (
		"command" in action &&
		typeof action.command === "string" &&
		!("edit" in action)
	) {
		// It's a Command
		const cmd = action as vscode.Command
		return {
			title: cmd.title,
			command: cmd.command,
			arguments: cmd.arguments,
		}
	}

	const codeAction = action as vscode.CodeAction
	return {
		title: codeAction.title,
		kind: codeAction.kind?.value as CodeActionKind,
		diagnostics: codeAction.diagnostics?.map((d) => ({
			range: toLspRange(d.range),
			message: d.message,
		})),
		edit: codeAction.edit ? toLspWorkspaceEdit(codeAction.edit) : undefined,
		command: codeAction.command
			? {
					title: codeAction.command.title,
					command: codeAction.command.command,
					arguments: codeAction.command.arguments,
				}
			: undefined,
	}
}

export function toLspDiagnosticSeverity(
	vsSeverity: vscode.DiagnosticSeverity,
): DiagnosticSeverity {
	switch (vsSeverity) {
		case vscode.DiagnosticSeverity.Error:
			return DiagnosticSeverity.Error
		case vscode.DiagnosticSeverity.Warning:
			return DiagnosticSeverity.Warning
		case vscode.DiagnosticSeverity.Information:
			return DiagnosticSeverity.Information
		case vscode.DiagnosticSeverity.Hint:
			return DiagnosticSeverity.Hint
		default:
			return DiagnosticSeverity.Error
	}
}
