/**
 * Valve KeyValues (VDF) Tokenizer and Parser
 * Robust, handles nested objects, quotes, escaped chars, and comments.
 */

export function parseVDF(text) {
  let pos = 0;
  const len = text.length;

  function skipWhitespaceAndComments() {
    while (pos < len) {
      const c = text[pos];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        pos++;
      } else if (c === '/' && pos + 1 < len && text[pos + 1] === '/') {
        // Comment until newline
        pos += 2;
        while (pos < len && text[pos] !== '\n' && text[pos] !== '\r') {
          pos++;
        }
      } else {
        break;
      }
    }
  }

  function parseString() {
    if (text[pos] === '"') {
      pos++; // skip opening quote
      let str = '';
      while (pos < len) {
        const c = text[pos];
        if (c === '\\') {
          pos++;
          if (pos < len) {
            const next = text[pos];
            if (next === 'n') str += '\n';
            else if (next === 't') str += '\t';
            else if (next === '"') str += '"';
            else if (next === '\\') str += '\\';
            else str += next;
            pos++;
          }
        } else if (c === '"') {
          pos++; // skip closing quote
          return str;
        } else {
          str += c;
          pos++;
        }
      }
      return str;
    } else {
      // Unquoted string
      let str = '';
      while (pos < len) {
        const c = text[pos];
        if (c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '{' || c === '}' || c === '"') {
          break;
        }
        str += c;
        pos++;
      }
      return str;
    }
  }

  function parseObject() {
    const obj = {};
    while (pos < len) {
      skipWhitespaceAndComments();
      if (pos >= len) break;
      if (text[pos] === '}') {
        pos++; // close object
        return obj;
      }

      const key = parseString();
      if (!key) {
        if (pos < len && text[pos] === '}') {
          pos++;
          return obj;
        }
        pos++;
        continue;
      }

      skipWhitespaceAndComments();
      if (pos >= len) break;

      if (text[pos] === '{') {
        pos++; // open object
        const child = parseObject();
        if (obj[key] !== undefined) {
          // If duplicate key, convert to array or merge
          if (!Array.isArray(obj[key])) {
            obj[key] = [obj[key]];
          }
          obj[key].push(child);
        } else {
          obj[key] = child;
        }
      } else {
        const val = parseString();
        obj[key] = val;
      }
    }
    return obj;
  }

  skipWhitespaceAndComments();
  return parseObject();
}

export function stringifyVDF(obj, indent = 0) {
  let result = '';
  const tabs = '\t'.repeat(indent);

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      result += `${tabs}"${key}"\n${tabs}{\n`;
      result += stringifyVDF(val, indent + 1);
      result += `${tabs}}\n`;
    } else if (Array.isArray(val)) {
      for (const item of val) {
        result += `${tabs}"${key}"\n${tabs}{\n`;
        result += stringifyVDF(item, indent + 1);
        result += `${tabs}}\n`;
      }
    } else {
      result += `${tabs}"${key}"\t\t"${val}"\n`;
    }
  }

  return result;
}
