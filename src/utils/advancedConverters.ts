import * as vscode from "vscode"
import type {
	CodeLens,
	ColorInformation,
	ColorPresentation,
	DocumentLink,
	FoldingRange,
	InlayHint,
	ParameterInformation,
	SelectionRange,
	SemanticTokens,
	SignatureHelp,
	SignatureInformation,
} from "vscode-languageserver-protocol"
import { FoldingRangeKind, InlayHintKind } from "vscode-languageserver-protocol"
import { toLspPosition, toLspRange, toLspTextEdit } from "./converters"

export function toLspSignatureHelp(help: vscode.SignatureHelp): SignatureHelp {
	return {
		signatures: help.signatures.map(
			(sig): SignatureInformation => ({
				label: sig.label,
				documentation:
					typeof sig.documentation === "string"
						? sig.documentation
						: sig.documentation?.value,
				parameters: sig.parameters.map(
					(param): ParameterInformation => ({
						label: param.label,
						documentation:
							typeof param.documentation === "string"
								? param.documentation
								: param.documentation?.value,
					}),
				),
				activeParameter: sig.activeParameter,
			}),
		),
		activeSignature: help.activeSignature,
		activeParameter: help.activeParameter,
	}
}

export function toLspInlayHint(hint: vscode.InlayHint): InlayHint {
	return {
		position: toLspPosition(hint.position),
		label:
			typeof hint.label === "string"
				? hint.label
				: hint.label.map((l) => l.value).join(""),
		kind:
			hint.kind === vscode.InlayHintKind.Type
				? InlayHintKind.Type
				: hint.kind === vscode.InlayHintKind.Parameter
					? InlayHintKind.Parameter
					: undefined,
		textEdits: hint.textEdits?.map(toLspTextEdit),
		tooltip:
			typeof hint.tooltip === "string" ? hint.tooltip : hint.tooltip?.value,
		paddingLeft: hint.paddingLeft,
		paddingRight: hint.paddingRight,
	}
}

export function toLspCodeLens(lens: vscode.CodeLens): CodeLens {
	return {
		range: toLspRange(lens.range),
		command: lens.command
			? {
					title: lens.command.title,
					command: lens.command.command,
					arguments: lens.command.arguments,
				}
			: undefined,
		data: undefined,
	}
}

export function toLspDocumentLink(link: vscode.DocumentLink): DocumentLink {
	return {
		range: toLspRange(link.range),
		target: link.target?.toString(),
		tooltip: link.tooltip,
	}
}

export function toLspColorInformation(
	info: vscode.ColorInformation,
): ColorInformation {
	return {
		range: toLspRange(info.range),
		color: {
			red: info.color.red,
			green: info.color.green,
			blue: info.color.blue,
			alpha: info.color.alpha,
		},
	}
}

export function toLspColorPresentation(
	presentation: vscode.ColorPresentation,
): ColorPresentation {
	return {
		label: presentation.label,
		textEdit: presentation.textEdit
			? toLspTextEdit(presentation.textEdit)
			: undefined,
		additionalTextEdits: presentation.additionalTextEdits?.map(toLspTextEdit),
	}
}

export function toLspFoldingRange(range: vscode.FoldingRange): FoldingRange {
	let kind: string | undefined
	if (range.kind === vscode.FoldingRangeKind.Comment)
		kind = FoldingRangeKind.Comment
	else if (range.kind === vscode.FoldingRangeKind.Imports)
		kind = FoldingRangeKind.Imports
	else if (range.kind === vscode.FoldingRangeKind.Region)
		kind = FoldingRangeKind.Region

	return {
		startLine: range.start,
		endLine: range.end,
		kind,
	}
}

export function toLspSelectionRange(
	range: vscode.SelectionRange,
): SelectionRange {
	return {
		range: toLspRange(range.range),
		parent: range.parent ? toLspSelectionRange(range.parent) : undefined,
	}
}

export function toLspSemanticTokens(
	tokens: vscode.SemanticTokens,
): SemanticTokens {
	return {
		data: Array.from(tokens.data),
	}
}
