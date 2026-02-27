import * as vscode from "vscode";
import { BlamebotClient } from "./blamebot-client";

export const EXPLAIN_SCHEME = "blamebot-explain";

export class ExplainContentProvider
  implements vscode.TextDocumentContentProvider
{
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this._onDidChange.event;

  constructor(private client: BlamebotClient) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = JSON.parse(decodeURIComponent(uri.query));
    return await this.client.queryExplain(
      params.filePath,
      params.startLine,
      params.endLine
    );
  }
}

export function registerExplainCommand(
  context: vscode.ExtensionContext,
  client: BlamebotClient
): void {
  const provider = new ExplainContentProvider(client);
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      EXPLAIN_SCHEME,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "blamebot.showExplain",
      async (args: { filePath: string; startLine: number; endLine: number }) => {
        if (!args?.filePath) {
          vscode.window.showWarningMessage(
            "No file information available for explanation."
          );
          return;
        }

        const query = encodeURIComponent(JSON.stringify(args));
        const label = `L${args.startLine}-${args.endLine}`;
        const uri = vscode.Uri.parse(
          `${EXPLAIN_SCHEME}:/${label}.md?${query}`
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
