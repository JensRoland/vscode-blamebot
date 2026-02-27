export interface BlamebotRecord {
  file: string;
  lines: [number | null, number | null]; // [start, end], 1-indexed (legacy)
  current_lines?: string; // compact notation e.g. "5,7-8,12" (adjusted positions)
  superseded?: boolean; // true if content was overwritten by later edits
  ts: string; // ISO 8601
  prompt: string;
  reason: string;
  change: string;
  tool: string;
  author: string;
  content_hash: string;
  session: string;
  trace: string;
  source_file: string;
  match: "exact" | "changed" | "unknown";
}
