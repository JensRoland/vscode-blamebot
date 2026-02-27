import { execFile } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { BlamebotRecord } from "./types";

export class BlamebotClient {
  private getCliPath(): string {
    return vscode.workspace
      .getConfiguration("blamebot")
      .get<string>("cliPath", "git");
  }

  private getWorkspaceRoot(filePath: string): string | undefined {
    const folder = vscode.workspace.getWorkspaceFolder(
      vscode.Uri.file(filePath)
    );
    return folder?.uri.fsPath;
  }

  async queryFile(filePath: string): Promise<BlamebotRecord[]> {
    const cwd = this.getWorkspaceRoot(filePath);
    if (!cwd) {
      return [];
    }

    const relativePath = path.relative(cwd, filePath);
    const cli = this.getCliPath();

    try {
      const stdout = await this.exec(cli, ["blamebot", relativePath, "--json"], cwd);
      if (!stdout.trim()) {
        return [];
      }
      return JSON.parse(stdout) as BlamebotRecord[];
    } catch {
      return [];
    }
  }

  async queryTrace(traceRef: string): Promise<string> {
    const cwd =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) {
      return "No workspace folder open.";
    }

    const cli = this.getCliPath();

    try {
      return await this.exec(cli, ["blamebot", "--trace", traceRef], cwd);
    } catch {
      return `Failed to retrieve trace for: ${traceRef}`;
    }
  }

  async queryExplain(
    filePath: string,
    startLine: number,
    endLine: number
  ): Promise<string> {
    const cwd = this.getWorkspaceRoot(filePath);
    if (!cwd) {
      return "No workspace folder open.";
    }

    const relativePath = path.relative(cwd, filePath);
    const cli = this.getCliPath();

    try {
      return await this.exec(
        cli,
        ["blamebot", "--explain", relativePath, "-L", `${startLine},${endLine}`],
        cwd
      );
    } catch {
      return `Failed to retrieve explanation for ${relativePath} lines ${startLine}-${endLine}.`;
    }
  }

  private exec(
    command: string,
    args: string[],
    cwd: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        command,
        args,
        { cwd, timeout: 10_000, maxBuffer: 5 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    });
  }
}
