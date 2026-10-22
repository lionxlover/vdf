/**
 * Zolto Math Lexer — Phase 4
 * 
 * Groups and classifies raw tokens from the tokenizer.
 * Standardizes functions (sin, cos, etc.) and custom functions.
 */

import { Token } from './tokenizer.js';

export const KNOWN_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln',
  'exp', 'sqrt', 'max', 'min', 'floor', 'ceil', 'round', 'abs',
  'mod', 'gcd', 'lcm'
]);

export function lex(rawTokens) {
  const tokens = [];
  let i = 0;

  while (i < rawTokens.length) {
    const tok = rawTokens[i];

    if (tok.type === 'EOF') {
      tokens.push(tok);
      break;
    }

    // Try to match a known multi-character function (e.g. s, i, n -> sin)
    if (tok.type === 'IDENT') {
      let word = '';
      let j = 0;
      while (i + j < rawTokens.length && rawTokens[i + j].type === 'IDENT') {
        word += rawTokens[i + j].value;
        j++;
      }

      if (KNOWN_FUNCTIONS.has(word)) {
        tokens.push(new Token('FUNCTION', word, tok.pos, tok.line, tok.char));
        i += j;
        continue;
      }

      // Check if it's a custom function (any identifier word followed by '(')
      const nextNonSpace = rawTokens[i + j];
      if (nextNonSpace && nextNonSpace.type === 'PUNCT' && nextNonSpace.value === '(') {
        tokens.push(new Token('FUNCTION', word, tok.pos, tok.line, tok.char));
        i += j;
        continue;
      }
    }

    tokens.push(tok);
    i++;
  }

  return tokens;
}
