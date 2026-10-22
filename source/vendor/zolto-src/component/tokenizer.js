/**
 * Zolto Component Tokenizer — Phase 9
 *
 * Scans component, template, macro, slot, conditional, loop definitions
 * and invocation blocks in both keyword and directive syntax.
 */

export const ComponentTokenType = Object.freeze({
  KEYWORD:     'keyword',
  IDENTIFIER:  'identifier',
  STRING:      'string',
  NUMBER:      'number',
  EQUALS:      'equals',
  COLON:       'colon',
  BANG:        'bang',
  OPEN_PAREN:  'open_paren',
  CLOSE_PAREN: 'close_paren',
  OPEN_BRACE:  'open_brace',
  CLOSE_BRACE: 'close_brace',
  OPEN_TAG:    'open_tag',
  CLOSE_TAG:   'close_tag',
  SLASH:       'slash',
  NEWLINE:     'newline',
  EXPR:        'expr',
  EOF:         'eof',
});

const KEYWORDS = new Set([
  'component', 'template', 'macro', 'slot', 'fill', 'extends',
  'if', 'elseif', 'else', 'each', 'as', 'key', 'end', 'import', 'registry',
]);

export function tokenizeComponentSource(source) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  while (pos < source.length) {
    const ch = source[pos];

    if (ch === '\n') {
      tokens.push({ type: ComponentTokenType.NEWLINE, value: '\n', line, column: col });
      pos++;
      line++;
      col = 1;
      continue;
    }

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      pos++;
      col++;
      continue;
    }

    // Single-line comment //
    if (ch === '/' && source[pos + 1] === '/') {
      while (pos < source.length && source[pos] !== '\n') pos++;
      continue;
    }

    // Directives @component, @slot etc.
    if (ch === '@') {
      pos++;
      let dirName = '';
      while (pos < source.length && /[a-zA-Z0-9_\/]/ .test(source[pos])) {
        dirName += source[pos++];
      }
      tokens.push({ type: ComponentTokenType.KEYWORD, value: dirName, line, column: col });
      col += dirName.length + 1;
      continue;
    }

    if (ch === '=') {
      tokens.push({ type: ComponentTokenType.EQUALS, value: '=', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === ':') {
      tokens.push({ type: ComponentTokenType.COLON, value: ':', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === '!') {
      tokens.push({ type: ComponentTokenType.BANG, value: '!', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: ComponentTokenType.OPEN_PAREN, value: '(', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: ComponentTokenType.CLOSE_PAREN, value: ')', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === '<') {
      tokens.push({ type: ComponentTokenType.OPEN_TAG, value: '<', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === '>') {
      tokens.push({ type: ComponentTokenType.CLOSE_TAG, value: '>', line, column: col++ });
      pos++;
      continue;
    }

    if (ch === '/') {
      tokens.push({ type: ComponentTokenType.SLASH, value: '/', line, column: col++ });
      pos++;
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let strVal = '';
      pos++;
      col++;
      while (pos < source.length && source[pos] !== quote) {
        if (source[pos] === '\\' && pos + 1 < source.length) {
          strVal += source[pos + 1];
          pos += 2;
          col += 2;
        } else {
          strVal += source[pos++];
          col++;
        }
      }
      if (pos < source.length) {
        pos++;
        col++;
      }
      tokens.push({ type: ComponentTokenType.STRING, value: strVal, line, column: col });
      continue;
    }

    // Expressions {title}
    if (ch === '{') {
      let depth = 1;
      let exprVal = '';
      const startCol = col;
      pos++;
      col++;
      while (pos < source.length && depth > 0) {
        if (source[pos] === '{') depth++;
        else if (source[pos] === '}') depth--;
        if (depth > 0) exprVal += source[pos];
        pos++;
        col++;
      }
      tokens.push({ type: ComponentTokenType.EXPR, value: `{${exprVal.trim()}}`, line, column: startCol });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let numStr = '';
      while (pos < source.length && /[0-9\.]/.test(source[pos])) {
        numStr += source[pos++];
        col++;
      }
      tokens.push({ type: ComponentTokenType.NUMBER, value: Number(numStr), line, column: col });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = '';
      while (pos < source.length && /[a-zA-Z0-9_\-\!]/.test(source[pos])) {
        idStr += source[pos++];
        col++;
      }
      const lower = idStr.toLowerCase();
      const type = KEYWORDS.has(lower) ? ComponentTokenType.KEYWORD : ComponentTokenType.IDENTIFIER;
      tokens.push({ type, value: idStr, line, column: col });
      continue;
    }

    // Unknown char
    pos++;
    col++;
  }

  tokens.push({ type: ComponentTokenType.EOF, value: '', line, column: col });
  return tokens;
}
