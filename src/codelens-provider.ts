import * as vscode from "vscode";
import { BlamebotCache } from "./cache";
import { BlamebotRecord } from "./types";
import { effectiveLines } from "./lineset";

export class BlamebotCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChange = new vscode.EventEmitter<void>();
  onDidChangeCodeLenses = this._onDidChange.event;

  constructor(private cache: BlamebotCache) {}

  async provideCodeLenses(
    document: vscode.TextDocument
  ): Promise<vscode.CodeLens[]> {
    const config = vscode.workspace.getConfiguration("blamebot");
    if (
      !config.get<boolean>("enabled", true) ||
      !config.get<boolean>("codeLens", true)
    ) {
      return [];
    }

    const filePath = document.uri.fsPath;
    const records = this.cache.get(filePath);
    if (!records || records.length === 0) {
      return [];
    }

    const symbols =
      await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
        "vscode.executeDocumentSymbolProvider",
        document.uri
      );
    if (!symbols) {
      return [];
    }

    const lenses: vscode.CodeLens[] = [];
    const flatSymbols = flattenSymbols(symbols);

    for (const symbol of flatSymbols) {
      if (
        ![
          vscode.SymbolKind.Function,
          vscode.SymbolKind.Method,
          vscode.SymbolKind.Class,
          vscode.SymbolKind.Constructor,
        ].includes(symbol.kind)
      ) {
        continue;
      }

      const overlapping = records.filter((r) => {
        if (r.superseded) {
          return false;
        }
        const lines = effectiveLines(r);
        if (lines.length === 0) {
          return false;
        }
        const min = lines[0];
        const max = lines[lines.length - 1];
        return (
          min - 1 <= symbol.range.end.line &&
          max - 1 >= symbol.range.start.line
        );
      });
      if (overlapping.length === 0) {
        continue;
      }

      const mostRecent = overlapping.reduce((a, b) =>
        new Date(a.ts) > new Date(b.ts) ? a : b
      );

      lenses.push(
        new vscode.CodeLens(symbol.range, {
          title: `$(sparkle) AI: ${truncate(mostRecent.prompt, 80)}`,
          command: "blamebot.showTrace",
          arguments: [mostRecent.trace],
          tooltip: mostRecent.reason || mostRecent.prompt,
        })
      );
    }

    return lenses;
  }

  refresh(): void {
    this._onDidChange.fire();
  }
}

function flattenSymbols(
  symbols: vscode.DocumentSymbol[]
): vscode.DocumentSymbol[] {
  const result: vscode.DocumentSymbol[] = [];
  for (const symbol of symbols) {
    result.push(symbol);
    if (symbol.children.length > 0) {
      result.push(...flattenSymbols(symbol.children));
    }
  }
  return result;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }
  return text.slice(0, maxLen - 3) + "...";
}
