import * as vscode from "vscode"
import type { ProtocolConnection } from "vscode-languageserver-protocol"
import {
	CallHierarchyIncomingCallsRequest,
	CallHierarchyOutgoingCallsRequest,
	CallHierarchyPrepareRequest,
	TypeHierarchyPrepareRequest,
	TypeHierarchySubtypesRequest,
	TypeHierarchySupertypesRequest,
} from "vscode-languageserver-protocol"
import {
	toVsCodePosition,
	toVsCodeRange,
	toVsCodeSymbolKind,
	toVsCodeUri,
} from "../utils/converters"
import {
	toLspCallHierarchyIncomingCall,
	toLspCallHierarchyItem,
	toLspCallHierarchyOutgoingCall,
	toLspTypeHierarchyItem,
} from "../utils/hierarchyConverters"

export function registerHierarchyHandlers(connection: ProtocolConnection) {
	connection.onRequest(
		CallHierarchyPrepareRequest.type,
		async (params, token) => {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const items = await vscode.commands.executeCommand<
				vscode.CallHierarchyItem[]
			>("vscode.prepareCallHierarchy", uri, pos, token)

			if (!items || items.length === 0) {
				return null
			}

			return items.map(toLspCallHierarchyItem)
		},
	)

	connection.onRequest(
		CallHierarchyIncomingCallsRequest.type,
		async (params, token) => {
			// We have to reconstruct the CallHierarchyItem from params.item
			// However, the vscode API expects an item from prepareCallHierarchy.
			// It might be challenging if the item doesn't map perfectly.
			// For simplicity, we create a matching vscode.CallHierarchyItem.
			const uri = vscode.Uri.parse(params.item.uri)
			const item = new vscode.CallHierarchyItem(
				toVsCodeSymbolKind(params.item.kind),
				params.item.name,
				params.item.detail || "",
				uri,
				toVsCodeRange(params.item.range),
				toVsCodeRange(params.item.selectionRange),
			)

			const calls = await vscode.commands.executeCommand<
				vscode.CallHierarchyIncomingCall[]
			>("vscode.provideIncomingCalls", item, token)

			if (!calls || calls.length === 0) {
				return null
			}

			return calls.map(toLspCallHierarchyIncomingCall)
		},
	)

	connection.onRequest(
		CallHierarchyOutgoingCallsRequest.type,
		async (params, token) => {
			const uri = vscode.Uri.parse(params.item.uri)
			const item = new vscode.CallHierarchyItem(
				toVsCodeSymbolKind(params.item.kind),
				params.item.name,
				params.item.detail || "",
				uri,
				toVsCodeRange(params.item.range),
				toVsCodeRange(params.item.selectionRange),
			)

			const calls = await vscode.commands.executeCommand<
				vscode.CallHierarchyOutgoingCall[]
			>("vscode.provideOutgoingCalls", item, token)

			if (!calls || calls.length === 0) {
				return null
			}

			return calls.map(toLspCallHierarchyOutgoingCall)
		},
	)

	connection.onRequest(
		TypeHierarchyPrepareRequest.type,
		async (params, token) => {
			const uri = toVsCodeUri(params.textDocument.uri)
			const pos = toVsCodePosition(params.position)
			const items = await vscode.commands.executeCommand<
				vscode.TypeHierarchyItem[]
			>("vscode.prepareTypeHierarchy", uri, pos, token)

			if (!items || items.length === 0) {
				return null
			}

			return items.map(toLspTypeHierarchyItem)
		},
	)

	connection.onRequest(
		TypeHierarchySupertypesRequest.type,
		async (params, token) => {
			const uri = vscode.Uri.parse(params.item.uri)
			const item = new vscode.TypeHierarchyItem(
				toVsCodeSymbolKind(params.item.kind),
				params.item.name,
				params.item.detail || "",
				uri,
				toVsCodeRange(params.item.range),
				toVsCodeRange(params.item.selectionRange),
			)

			const items = await vscode.commands.executeCommand<
				vscode.TypeHierarchyItem[]
			>("vscode.provideSupertypes", item, token)

			if (!items || items.length === 0) {
				return null
			}

			return items.map(toLspTypeHierarchyItem)
		},
	)

	connection.onRequest(
		TypeHierarchySubtypesRequest.type,
		async (params, token) => {
			const uri = vscode.Uri.parse(params.item.uri)
			const item = new vscode.TypeHierarchyItem(
				toVsCodeSymbolKind(params.item.kind),
				params.item.name,
				params.item.detail || "",
				uri,
				toVsCodeRange(params.item.range),
				toVsCodeRange(params.item.selectionRange),
			)

			const items = await vscode.commands.executeCommand<
				vscode.TypeHierarchyItem[]
			>("vscode.provideSubtypes", item, token)

			if (!items || items.length === 0) {
				return null
			}

			return items.map(toLspTypeHierarchyItem)
		},
	)
}
