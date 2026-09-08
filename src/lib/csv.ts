/**
 * CSV building for admin exports.
 *
 * Small enough to be obvious, but two details are not: escaping, and the
 * spreadsheet-formula problem. Both are handled here once rather than at
 * each export site.
 */

/**
 * Quote and escape a single field.
 *
 * The leading apostrophe on anything starting with = + - @ is not
 * cosmetic. Excel, LibreOffice and Google Sheets treat those as the start
 * of a formula, so an address like "=cmd|'/c calc'!A1"@x.com becomes code
 * the moment the file is opened. This is CSV injection, and an export of
 * user-supplied strings — which is exactly what a subscriber list is — is
 * the textbook case for it.
 */
export function csvField(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  // Doubling the quote is how CSV escapes a quote; wrapping every field
  // means commas and newlines inside a value can never split a row.
  return `"${guarded.replace(/"/g, '""')}"`;
}

/** Build a CSV document from a header row and body rows. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvField).join(","),
    ...rows.map(row => row.map(csvField).join(",")),
  ];
  // CRLF: what the CSV spec says, and what Excel on Windows expects.
  return lines.join("\r\n");
}

/**
 * Hand the finished file to the browser.
 *
 * The BOM is what makes Excel read the file as UTF-8; without it, any
 * non-ASCII character in a name or address arrives mangled.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
