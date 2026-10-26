/**
 * Builds one CSV cell that is safe to open in Excel / Google Sheets / LibreOffice.
 * - Text starting with = + - @ (or a tab / carriage return) is prefixed with a single
 *   quote so the spreadsheet shows it as text instead of running it as a formula.
 * - Every cell is quoted, with embedded quotes doubled.
 * Real numbers (e.g. totals, negative balances) are left untouched.
 */
export function csvCell(value: unknown): string {
  if (value == null) return '""';
  if (typeof value === "number" || typeof value === "bigint") {
    return `"${String(value)}"`;
  }
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}
