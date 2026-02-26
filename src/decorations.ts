import * as vscode from "vscode";
import { BlamebotCache } from "./cache";
import { BlamebotClient } from "./blamebot-client";
import { BlamebotRecord } from "./types";

export class DecorationManager {
  private exactDecoration: vscode.TextEditorDecorationType;
  private changedDecoration: vscode.TextEditorDecorationType;
  private inlineDecoration: vscode.TextEditorDecorationType;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingQueries = new Set<string>();

  constructor(
    private context: vscode.ExtensionContext,
    private cache: BlamebotCache,
    private client: BlamebotClient
  ) {
    this.exactDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath("media/ai-icon.svg"),
      gutterIconSize: "contain",
      overviewRulerColor: new vscode.ThemeColor("blamebot.exactMatchRuler"),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    this.changedDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath("media/ai-icon-changed.svg"),
      gutterIconSize: "contain",
      overviewRulerColor: new vscode.ThemeColor("blamebot.changedMatchRuler"),
      overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    this.inlineDecoration = vscode.window.createTextEditorDecorationType({
      after: {
        textDecoration: "none; opacity: 0.4; font-style: italic;",
        margin: "0 0 0 3em",
      },
    });
  }

  activate(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.debouncedRefresh();
      }),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        this.updateInlineAnnotation(e.textEditor);
      }),
      this.exactDecoration,
      this.changedDecoration,
      this.inlineDecoration
    );

    // Initial decoration for the active editor
    if (vscode.window.activeTextEditor) {
      this.refreshEditor(vscode.window.activeTextEditor.document.uri);
    }
  }

  async refreshEditor(uri: vscode.Uri): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.fsPath !== uri.fsPath) {
      return;
    }
    await this.ensureCached(editor);
    this.applyDecorations(editor);
  }

  refreshActiveEditor(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.refreshEditor(editor.document.uri);
    }
  }

  private debouncedRefresh(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.refreshActiveEditor();
    }, 300);
  }

  private async ensureCached(
    editor: vscode.TextEditor
  ): Promise<void> {
    const filePath = editor.document.uri.fsPath;
    if (this.cache.get(filePath) !== undefined) {
      return;
    }
    if (this.pendingQueries.has(filePath)) {
      return;
    }

    this.pendingQueries.add(filePath);
    try {
      const records = await this.client.queryFile(filePath);
      this.cache.set(filePath, records);
    } finally {
      this.pendingQueries.delete(filePath);
    }
  }

  private applyDecorations(editor: vscode.TextEditor): void {
    const config = vscode.workspace.getConfiguration("blamebot");
    if (!config.get<boolean>("enabled", true)) {
      this.clearDecorations(editor);
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const records = this.cache.get(filePath);
    if (!records || records.length === 0) {
      this.clearDecorations(editor);
      return;
    }

    const showGutter = config.get<boolean>("gutterIcons", true);
    const exactRanges: vscode.DecorationOptions[] = [];
    const changedRanges: vscode.DecorationOptions[] = [];

    if (showGutter) {
      for (const record of records) {
        const [start, end] = record.lines;
        if (start == null || end == null) {
          continue;
        }
        const range = new vscode.Range(
          start - 1, 0,
          end - 1, 0
        );
        const options: vscode.DecorationOptions = { range };

        if (record.match === "exact") {
          exactRanges.push(options);
        } else {
          changedRanges.push(options);
        }
      }
    }

    editor.setDecorations(this.exactDecoration, exactRanges);
    editor.setDecorations(this.changedDecoration, changedRanges);

    this.updateInlineAnnotation(editor);
  }

  private updateInlineAnnotation(editor: vscode.TextEditor): void {
    const config = vscode.workspace.getConfiguration("blamebot");
    if (
      !config.get<boolean>("enabled", true) ||
      !config.get<boolean>("inlineAnnotations", true)
    ) {
      editor.setDecorations(this.inlineDecoration, []);
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const cursorLine = editor.selection.active.line + 1; // 1-indexed
    const record = this.cache.getForLine(filePath, cursorLine);

    if (!record) {
      editor.setDecorations(this.inlineDecoration, []);
      return;
    }

    const text = record.reason || record.prompt;
    const truncated = text.length > 80 ? text.slice(0, 77) + "..." : text;

    const decoration: vscode.DecorationOptions = {
      range: new vscode.Range(
        cursorLine - 1, Number.MAX_SAFE_INTEGER,
        cursorLine - 1, Number.MAX_SAFE_INTEGER
      ),
      renderOptions: {
        after: {
          contentText: `  ✦ ${truncated}`,
        },
      },
    };

    editor.setDecorations(this.inlineDecoration, [decoration]);
  }

  private clearDecorations(editor: vscode.TextEditor): void {
    editor.setDecorations(this.exactDecoration, []);
    editor.setDecorations(this.changedDecoration, []);
    editor.setDecorations(this.inlineDecoration, []);
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.exactDecoration.dispose();
    this.changedDecoration.dispose();
    this.inlineDecoration.dispose();
  }
}
