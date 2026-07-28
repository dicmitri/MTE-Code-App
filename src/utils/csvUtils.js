export function parseSemicolonCsv(csvText) {
  const input = String(csvText || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (character === '"') {
      if (inQuotes && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === ';') {
      pushField();
      continue;
    }

    if (!inQuotes && (character === '\n' || character === '\r')) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      pushRow();
      continue;
    }

    field += character;
  }

  if (inQuotes) {
    throw new Error('The CSV template contains an unterminated quoted field.');
  }

  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmptyRows = rows.filter((cells) => cells.some((cell) => cell.length > 0));
  const [headers = [], ...records] = nonEmptyRows;

  if (headers.length === 0) {
    throw new Error('The CSV template does not contain a header row.');
  }

  records.forEach((cells, rowIndex) => {
    if (cells.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${cells.length} cells; expected ${headers.length}.`,
      );
    }
  });

  return { headers, rows: records };
}
