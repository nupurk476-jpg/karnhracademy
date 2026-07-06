/**
 * Small, dependency-free CSV parser (RFC 4180 flavored): quoted fields,
 * escaped quotes, embedded newlines, CRLF. Enough for messy exports.
 */
export function parseCSV(input: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // skip fully empty trailing rows
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    if (ch === "\r") {
      if (input[i + 1] === "\n") i++;
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

/** Guess the delimiter from the first line (comma, semicolon or tab). */
export function sniffDelimiter(input: string): string {
  const firstLine = input.slice(0, input.indexOf("\n") === -1 ? undefined : input.indexOf("\n"));
  const counts: [string, number][] = [",", ";", "\t"].map((d) => [
    d,
    firstLine.split(d).length - 1,
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}
