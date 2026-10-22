/**
 * Zolto Math Tokenizer — Phase 4
 */

export class Token {
  constructor(type, value, pos, line = 1, char = 1) {
    this.type  = type;  // 'NUMBER' | 'IDENT' | 'COMMAND' | 'OPERATOR' | 'PUNCT' | 'EOF'
    this.value = value;
    this.pos   = pos;
    this.line  = line;
    this.char  = char;
  }
}

export function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let char = 1;

  while (i < src.length) {
    const c = src[i];

    // Handle newlines and track positions
    if (c === '\n') {
      line++;
      char = 1;
      i++;
      continue;
    }

    // Ignore spaces
    if (/[ \t\r]/.test(c)) {
      char++;
      i++;
      continue;
    }

    // Number matching
    if (/[0-9]/.test(c)) {
      let val = '';
      const startChar = char;
      const startPos = i;
      while (i < src.length && /[0-9.]/.test(src[i])) {
        // Simple float detection: only one dot allowed
        if (src[i] === '.' && val.includes('.')) break;
        val += src[i];
        i++;
        char++;
      }
      tokens.push(new Token('NUMBER', val, startPos, line, startChar));
      continue;
    }

    // Commands matching (e.g. \frac, \alpha)
    if (c === '\\') {
      const startChar = char;
      const startPos = i;
      i++; // skip '\'
      char++;
      
      let val = '';
      if (i < src.length && /[a-zA-Z]/.test(src[i])) {
        while (i < src.length && /[a-zA-Z]/.test(src[i])) {
          val += src[i];
          i++;
          char++;
        }
      } else if (i < src.length) {
        // Single non-alpha character commands like \; or \, or \\
        val = src[i];
        i++;
        char++;
      }
      tokens.push(new Token('COMMAND', val, startPos, line, startChar));
      continue;
    }

    // Identifiers (variables)
    // Individual alphabetic characters are treated as separate identifiers (standard LaTeX math style)
    if (/[a-zA-Z]/.test(c)) {
      tokens.push(new Token('IDENT', c, i, line, char));
      i++;
      char++;
      continue;
    }

    // Double character operator/punctuation (like \\)
    if (c === '\\' && src[i + 1] === '\\') {
      tokens.push(new Token('PUNCT', '\\\\', i, line, char));
      i += 2;
      char += 2;
      continue;
    }

    // Single character operators & punctuation
    if (['+', '-', '*', '/', '^', '_', '=', '<', '>', '~', '!', '?', '|', ':'].includes(c)) {
      tokens.push(new Token('OPERATOR', c, i, line, char));
      i++;
      char++;
      continue;
    }

    if (['(', ')', '{', '}', '[', ']', '&', ';', ','].includes(c)) {
      tokens.push(new Token('PUNCT', c, i, line, char));
      i++;
      char++;
      continue;
    }

    // Unknown characters
    tokens.push(new Token('OPERATOR', c, i, line, char));
    i++;
    char++;
  }

  tokens.push(new Token('EOF', '', i, line, char));
  return tokens;
}
