export interface BlamebotRecord {
  file: string;
  lines: [number, number]; // [start, end], 1-indexed
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
