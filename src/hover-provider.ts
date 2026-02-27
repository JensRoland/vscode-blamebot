import * as vscode from "vscode";
import { BlamebotCache } from "./cache";
import { effectiveLines } from "./lineset";

export class BlamebotHoverProvider implements vscode.HoverProvider {
  constructor(private cache: BlamebotCache) {}

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Hover | undefined {
    const config = vscode.workspace.getConfiguration("blamebot");
    if (!config.get<boolean>("enabled", true)) {
      return undefined;
    }

    const line = position.line + 1; // 1-indexed for blamebot
    const record = this.cache.getForLine(document.uri.fsPath, line);
    if (!record) {
      return undefined;
    }

    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    const matchLabel =
      record.match === "exact" ? "exact match" : "content changed";
    const date = new Date(record.ts).toLocaleString();

    md.appendMarkdown(`**$(sparkle) AI-Authored** _(${matchLabel})_\n\n`);
    md.appendMarkdown(`---\n\n`);

    if (record.prompt) {
      md.appendMarkdown(`**Prompt:** ${escapeMarkdown(record.prompt)}\n\n`);
    }
    if (record.reason) {
      md.appendMarkdown(`**Reason:** ${escapeMarkdown(record.reason)}\n\n`);
    }
    if (record.change) {
      md.appendMarkdown(`**Change:** \`${record.change}\`\n\n`);
    }

    md.appendMarkdown(`**Author:** ${escapeMarkdown(record.author)}`);
    md.appendMarkdown(` &nbsp;|&nbsp; **Tool:** ${record.tool}`);
    md.appendMarkdown(` &nbsp;|&nbsp; **When:** ${date}\n\n`);

    const links: string[] = [];

    if (record.trace) {
      const traceArg = encodeURIComponent(JSON.stringify(record.trace));
      links.push(
        `[$(eye) View Full Trace](command:blamebot.showTrace?${traceArg})`
      );
    }

    const lines = effectiveLines(record);
    const startLine = lines.length > 0 ? lines[0] : record.lines[0];
    const endLine = lines.length > 0 ? lines[lines.length - 1] : record.lines[1];
    const explainArg = encodeURIComponent(
      JSON.stringify({
        filePath: document.uri.fsPath,
        startLine,
        endLine,
      })
    );
    links.push(
      `[$(lightbulb) Explain](command:blamebot.showExplain?${explainArg})`
    );

    md.appendMarkdown(links.join(" &nbsp;|&nbsp; "));

    return new vscode.Hover(md);
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!|]/g, "\\$&");
}
