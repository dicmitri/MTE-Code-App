const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  bull: '•',
  gt: '>',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
};

export function htmlToPlainText(value) {
  return String(value || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => (
      String.fromCodePoint(Number.parseInt(hex, 16))
    ))
    .replace(/&#([0-9]+);/g, (match, decimal) => (
      String.fromCodePoint(Number.parseInt(decimal, 10))
    ))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? ' ')
    .replace(/\u00a0/g, ' ');
}
