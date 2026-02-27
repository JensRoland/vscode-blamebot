/**
 * Parses compact line-set notation (e.g. "5,7-8,12") into a sorted
 * array of individual 1-indexed line numbers.
 */
export function parseLineSet(notation: string): number[] {
  const lines: number[] = [];
  for (const part of notation.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const dashIdx = trimmed.indexOf("-");
    if (dashIdx >= 0) {
      const start = parseInt(trimmed.slice(0, dashIdx), 10);
      const end = parseInt(trimmed.slice(dashIdx + 1), 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          lines.push(i);
        }
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n)) {
        lines.push(n);
      }
    }
  }
  return lines.sort((a, b) => a - b);
}

/**
 * Returns the effective set of 1-indexed line numbers for a record,
 * preferring current_lines (adjusted positions) over the original lines tuple.
 */
export function effectiveLines(record: {
  lines: [number | null, number | null];
  current_lines?: string;
}): number[] {
  if (record.current_lines) {
    return parseLineSet(record.current_lines);
  }
  const [start, end] = record.lines;
  if (start == null || end == null) {
    return [];
  }
  const lines: number[] = [];
  for (let i = start; i <= end; i++) {
    lines.push(i);
  }
  return lines;
}
