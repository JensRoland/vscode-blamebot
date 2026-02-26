import * as vscode from "vscode";
import { BlamebotClient } from "./blamebot-client";

export const TRACE_SCHEME = "blamebot-trace";

export class TraceContentProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this._onDidChange.event;

  constructor(private client: BlamebotClient) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    // The trace ref is stored in the URI path (without leading slash)
    const traceRef = uri.path.replace(/^\//, "").replace(/\.md$/, "");
    return await this.client.queryTrace(traceRef);
  }
}

export function registerTraceCommand(
  context: vscode.ExtensionContext
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "blamebot.showTrace",
      async (traceRef: string) => {
        if (!traceRef) {
          vscode.window.showWarningMessage(
            "No trace reference available for this record."
          );
          return;
        }

        // Use .md extension for markdown highlighting
        const uri = vscode.Uri.parse(
          `${TRACE_SCHEME}:/${traceRef}.md`
        );
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: true,
          preserveFocus: false,
        });
      }
    )
  );
}
