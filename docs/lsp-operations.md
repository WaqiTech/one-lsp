# LSP Operations

Standard feature parity with what modern IDEs extract from language servers.

### 1. Server Lifecycle (The Handshake)
* `initialize` (Negotiate capabilities)
* `initialized` (Client confirmation)
* `shutdown` (Graceful termination)
* `exit` (Process exit)

### 2. Document Synchronization (State Management)
* `textDocument/didOpen` (Load file into VS Code host)
* `textDocument/didChange` (Apply edits to VS Code's internal buffer)
* `textDocument/didClose` (Clean up resources)
* `textDocument/didSave` (Trigger disk save)

### 3. Navigation & Context (Read Operations)
* `textDocument/hover` (Documentation/types on hover)
* `textDocument/completion` (Autocomplete suggestions)
* `completionItem/resolve` (Fetch expensive details for a completion item)
* `textDocument/definition` (Go to Definition)
* `textDocument/declaration` (Go to Declaration)
* `textDocument/typeDefinition` (Go to Type)
* `textDocument/implementation` (Find Implementations)
* `textDocument/references` (Find All References)
* `textDocument/documentHighlight` (Highlight local occurrences of a symbol)
* `textDocument/documentSymbol` (Structural outline of the current file)
* `workspace/symbol` (Global symbol search across the project)

### 4. Code Modification (Write Operations)
* `textDocument/rename` (Execute safe variable rename)
* `textDocument/prepareRename` (Validate if a symbol can be renamed)
* `textDocument/codeAction` (Fetch quick-fixes, auto-imports, refactorings)
* `textDocument/formatting` (Format entire file)
* `textDocument/rangeFormatting` (Format selected block)
* `textDocument/onTypeFormatting` (Format as the user types triggers like `;`)

### 5. Advanced UI & Type Hints (Deep Context)
* `textDocument/signatureHelp` (Parameter hints for function calls)
* `textDocument/inlayHint` (Inline virtual text for types/parameters)
* `textDocument/codeLens` (Actionable links above code blocks)
* `textDocument/documentLink` (Clickable URLs or file paths)
* `textDocument/documentColor` (Find color definitions in CSS/UI files)
* `textDocument/colorPresentation` (Format color string modifications)
* `textDocument/foldingRange` (Provide code block collapse ranges)
* `textDocument/selectionRange` (Smart selection expansion ranges)
* `textDocument/semanticTokens/full` (Rich semantic syntax highlighting)

### 6. Call & Type Hierarchy (Structural Analysis)
* `textDocument/prepareCallHierarchy` (Initialize call tree)
* `callHierarchy/incomingCalls` (Functions calling this function)
* `callHierarchy/outgoingCalls` (Functions this function calls)
* `textDocument/prepareTypeHierarchy` (Initialize class/type tree)
* `typeHierarchy/supertypes` (Parent interfaces/classes)
* `typeHierarchy/subtypes` (Implementing/child classes)

### 7. Server-to-Client Push Notifications
*(You listen for these events in VS Code and push them to the client)*
* `textDocument/publishDiagnostics` (Push linting errors and warnings)
