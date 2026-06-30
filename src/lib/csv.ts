export function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if ([",", "\n", '"'].some((char) => text.includes(char))) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
