import * as vscode from "vscode";
import { BlamebotClient } from "./blamebot-client";
import { BlamebotCache } from "./cache";
import { DecorationManager } from "./decorations";
import { BlamebotHoverProvider } from "./hover-provider";
import { BlamebotCodeLensProvider } from "./codelens-provider";
import {
  TraceContentProvider,
  TRACE_SCHEME,
  registerTraceCommand,
} from "./trace-viewer";

export function activate(context: vscode.ExtensionContext): void {
  const client = new BlamebotClient();
  const cache = new BlamebotCache();

  // --- Decorations ---
  const decorationManager = new DecorationManager(context, cache, client);
  decorationManager.activate(context);

  // --- Hover ---
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      { scheme: "file" },
      new BlamebotHoverProvider(cache)
    )
  );

  // --- CodeLens ---
  const codeLensProvider = new BlamebotCodeLensProvider(cache);
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file" },
      codeLensProvider
    )
  );

  // --- Trace Viewer ---
  const traceProvider = new TraceContentProvider(client);
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      TRACE_SCHEME,
      traceProvider
    )
  );
  registerTraceCommand(context);

  // --- Commands ---
  context.subscriptions.push(
    vscode.commands.registerCommand("blamebot.refresh", () => {
      cache.invalidateAll();
      decorationManager.refreshActiveEditor();
      codeLensProvider.refresh();
    }),
    vscode.commands.registerCommand("blamebot.toggleAnnotations", () => {
      const config = vscode.workspace.getConfiguration("blamebot");
      const current = config.get<boolean>("enabled", true);
      config.update("enabled", !current, vscode.ConfigurationTarget.Global);
    })
  );

  // --- Cache invalidation on save ---
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      cache.invalidate(doc.uri.fsPath);
      decorationManager.refreshEditor(doc.uri);
      codeLensProvider.refresh();
    })
  );

  // --- Clean up cache when files are closed ---
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      cache.invalidate(doc.uri.fsPath);
    })
  );

  // --- React to config changes ---
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("blamebot")) {
        decorationManager.refreshActiveEditor();
        codeLensProvider.refresh();
      }
    })
  );
}

export function deactivate(): void {
  // Cleanup is handled by context.subscriptions
}
