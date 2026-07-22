function syntaxError(message, index) {
  return new SyntaxError(`${message} at character ${index}.`);
}

export function skipJsonWhitespace(source, startIndex) {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
}

function scanJsonString(source, startIndex) {
  if (source[startIndex] !== '"') {
    throw syntaxError('Expected a JSON string', startIndex);
  }

  let escaped = false;
  for (let index = startIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      return index + 1;
    }
  }

  throw syntaxError('Unterminated JSON string', startIndex);
}

function scanCompositeValue(source, startIndex) {
  const opening = source[startIndex];
  const closing = opening === '{' ? '}' : ']';
  const stack = [closing];
  let inString = false;
  let escaped = false;

  for (let index = startIndex + 1; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '{') {
      stack.push('}');
    } else if (character === '[') {
      stack.push(']');
    } else if (character === '}' || character === ']') {
      const expected = stack.pop();
      if (character !== expected) {
        throw syntaxError(`Expected "${expected}" but found "${character}"`, index);
      }
      if (stack.length === 0) return index + 1;
    }
  }

  throw syntaxError(`Unterminated JSON value; expected "${closing}"`, startIndex);
}

export function scanJsonValue(source, startIndex) {
  const index = skipJsonWhitespace(source, startIndex);
  const character = source[index];

  if (character === '"') return scanJsonString(source, index);
  if (character === '{' || character === '[') return scanCompositeValue(source, index);

  let endIndex = index;
  while (
    endIndex < source.length
    && !/[\s,\]}]/.test(source[endIndex])
  ) {
    endIndex += 1;
  }
  if (endIndex === index) throw syntaxError('Expected a JSON value', index);
  return endIndex;
}

export function findRootPropertyValue(source, propertyName) {
  let index = skipJsonWhitespace(source, 0);
  if (source[index] !== '{') throw syntaxError('Expected a root JSON object', index);
  index = skipJsonWhitespace(source, index + 1);

  while (index < source.length && source[index] !== '}') {
    const keyStart = index;
    const keyEnd = scanJsonString(source, keyStart);
    const key = JSON.parse(source.slice(keyStart, keyEnd));
    index = skipJsonWhitespace(source, keyEnd);
    if (source[index] !== ':') throw syntaxError('Expected ":" after object key', index);

    const valueStart = skipJsonWhitespace(source, index + 1);
    const valueEnd = scanJsonValue(source, valueStart);
    if (key === propertyName) return { start: valueStart, end: valueEnd };

    index = skipJsonWhitespace(source, valueEnd);
    if (source[index] === ',') {
      index = skipJsonWhitespace(source, index + 1);
    } else if (source[index] !== '}') {
      throw syntaxError('Expected "," or "}" after object value', index);
    }
  }

  throw new Error(`Root JSON property "${propertyName}" was not found.`);
}

export function extractJsonArrayElements(source, arrayStart) {
  let index = skipJsonWhitespace(source, arrayStart);
  if (source[index] !== '[') throw syntaxError('Expected a JSON array', index);
  index = skipJsonWhitespace(source, index + 1);

  const elements = [];
  while (index < source.length && source[index] !== ']') {
    const start = index;
    const end = scanJsonValue(source, start);
    elements.push({ start, end, raw: source.slice(start, end) });

    index = skipJsonWhitespace(source, end);
    if (source[index] === ',') {
      index = skipJsonWhitespace(source, index + 1);
    } else if (source[index] !== ']') {
      throw syntaxError('Expected "," or "]" after array element', index);
    }
  }

  if (source[index] !== ']') throw syntaxError('Unterminated JSON array', arrayStart);
  return { elements, end: index + 1 };
}

export function extractRootArrayProperty(source, propertyName) {
  JSON.parse(source);
  const property = findRootPropertyValue(source, propertyName);
  const array = extractJsonArrayElements(source, property.start);
  if (array.end !== property.end) {
    throw syntaxError(`Unexpected content after root property "${propertyName}"`, array.end);
  }

  const { elements } = array;
  return {
    elements,
    prefix: elements.length > 0 ? source.slice(0, elements[0].start) : source.slice(0, array.end - 1),
    separators: elements.slice(1).map((element, index) => (
      source.slice(elements[index].end, element.start)
    )),
    suffix: elements.length > 0 ? source.slice(elements.at(-1).end) : source.slice(array.end - 1),
  };
}
