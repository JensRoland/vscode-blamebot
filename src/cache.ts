import { BlamebotRecord } from "./types";

export class BlamebotCache {
  private cache = new Map<string, BlamebotRecord[]>();
  private lineIndex = new Map<string, Map<number, BlamebotRecord>>();

  get(filePath: string): BlamebotRecord[] | undefined {
    return this.cache.get(filePath);
  }

  getForLine(filePath: string, line: number): BlamebotRecord | undefined {
    return this.lineIndex.get(filePath)?.get(line);
  }

  set(filePath: string, records: BlamebotRecord[]): void {
    this.cache.set(filePath, records);
    this.buildLineIndex(filePath, records);
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
    this.lineIndex.delete(filePath);
  }

  invalidateAll(): void {
    this.cache.clear();
    this.lineIndex.clear();
  }

  private buildLineIndex(
    filePath: string,
    records: BlamebotRecord[]
  ): void {
    const index = new Map<number, BlamebotRecord>();

    // Sort by timestamp ascending so that later (more recent) records
    // overwrite earlier ones for the same line.
    const sorted = [...records].sort(
      (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
    );

    for (const record of sorted) {
      const [start, end] = record.lines;
      if (start == null || end == null) {
        continue;
      }
      for (let line = start; line <= end; line++) {
        index.set(line, record);
      }
    }

    this.lineIndex.set(filePath, index);
  }
}
