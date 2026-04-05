import type * as vscode from "vscode"
import type {
	CallHierarchyIncomingCall,
	CallHierarchyItem,
	CallHierarchyOutgoingCall,
	TypeHierarchyItem,
} from "vscode-languageserver-protocol"
import { toLspRange, toLspSymbolKind } from "./converters"

export function toLspCallHierarchyItem(
	item: vscode.CallHierarchyItem,
): CallHierarchyItem {
	return {
		name: item.name,
		kind: toLspSymbolKind(item.kind),
		tags: item.tags?.map((tag) => tag as 1),
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
		tags: item.tags?.map((tag) => tag as 1),
		detail: item.detail,
		uri: item.uri.toString(),
		range: toLspRange(item.range),
		selectionRange: toLspRange(item.selectionRange),
		data: undefined,
	}
}
