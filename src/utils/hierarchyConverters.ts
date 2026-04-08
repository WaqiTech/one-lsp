import * as vscode from "vscode"
import type {
	CallHierarchyIncomingCall,
	CallHierarchyItem,
	CallHierarchyOutgoingCall,
	TypeHierarchyItem,
} from "vscode-languageserver-protocol"
import { SymbolTag } from "vscode-languageserver-protocol"
import { toLspRange, toLspSymbolKind } from "./converters"

function toLspSymbolTag(tag: vscode.SymbolTag): SymbolTag | undefined {
	switch (tag) {
		case vscode.SymbolTag.Deprecated:
			return SymbolTag.Deprecated
		default:
			return undefined
	}
}

function toLspSymbolTags(
	tags: readonly vscode.SymbolTag[] | undefined,
): SymbolTag[] | undefined {
	if (!tags || tags.length === 0) {
		return undefined
	}

	const converted = tags
		.map(toLspSymbolTag)
		.filter((tag): tag is SymbolTag => tag !== undefined)

	return converted.length > 0 ? converted : undefined
}

export function toLspCallHierarchyItem(
	item: vscode.CallHierarchyItem,
): CallHierarchyItem {
	return {
		name: item.name,
		kind: toLspSymbolKind(item.kind),
		tags: toLspSymbolTags(item.tags),
		detail: item.detail,
		uri: item.uri.toString(),
		range: toLspRange(item.range),
		selectionRange: toLspRange(item.selectionRange),
		data: undefined, // VS Code CallHierarchyItem doesn't directly expose data in the API exactly as LSP does
	}
}

export function toLspCallHierarchyIncomingCall(
	call: vscode.CallHierarchyIncomingCall,
): CallHierarchyIncomingCall {
	return {
		from: toLspCallHierarchyItem(call.from),
		fromRanges: call.fromRanges.map(toLspRange),
	}
}

export function toLspCallHierarchyOutgoingCall(
	call: vscode.CallHierarchyOutgoingCall,
): CallHierarchyOutgoingCall {
	return {
		to: toLspCallHierarchyItem(call.to),
		fromRanges: call.fromRanges.map(toLspRange),
	}
}

export function toLspTypeHierarchyItem(
	item: vscode.TypeHierarchyItem,
): TypeHierarchyItem {
	return {
		name: item.name,
		kind: toLspSymbolKind(item.kind),
		tags: toLspSymbolTags(item.tags),
		detail: item.detail,
		uri: item.uri.toString(),
		range: toLspRange(item.range),
		selectionRange: toLspRange(item.selectionRange),
		data: undefined,
	}
}
