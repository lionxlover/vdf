/**
 * Zolto Math Tokenizer — Phase 4
 *
 * Converts a raw math source string (the content between `$…$` or inside
 * `@math … @/math`) into a flat token stream consumed by math-parser.js.
 *
 * This tokenizer is entirely independent of the Markdown tokenizer/lexer —
 * math has its own lexical rules (backslash commands, `^`/`_` are
 * structural, `{}` are grouping, whitespace is insignificant except inside
 * `\text{}`).
 */

// ─── Token types ──────────────────────────────────────────────────────────────

export const MT = Object.freeze({
  NUMBER:     'number',      // 3, 3.14, .5
  IDENT:      'ident',       // single-letter variable: x, y, a, b …
  COMMAND:    'command',     // \frac, \sqrt, \alpha, \left, \begin …
  LBRACE:     'lbrace',      // {
  RBRACE:     'rbrace',      // }
  LBRACKET:   'lbracket',    // [  (optional-arg delimiter, e.g. \sqrt[3]{x})
  RBRACKET:   'rbracket',    // ]
  CARET:      'caret',       // ^
  UNDERSCORE: 'underscore',  // _
  AMP:        'amp',         // &  (matrix/align column separator)
  NEWLINE:    'newline',     // \\ (matrix/align row separator)
  OP:         'op',          // + - = < > ! , ; : etc (single-char operators)
  TEXT:       'text',        // raw text captured inside \text{…}
  EOF:        'eof',
});

const SINGLE_CHAR_OPS = new Set(['+','-','=','<','>','!',',',';',':','\'','|','/','*']);

// ─── Tokenizer ────────────────────────────────────────────────────────────────

/**
 * @param {string} src
 * @returns {{ tokens: MathToken[], errors: {message:string}[] }}
 */
export function tokenizeMath(src) {
  const tokens = [];
  const errors = [];
  let i = 0;
  const len = src.length;

  const push = (type, value) => tokens.push({ type, value, pos: i });

  while (i < len) {
    const c = src[i];

    // Whitespace — insignificant, skip
    if (/\s/.test(c)) { i++; continue; }

    // Comment — % to end of line (LaTeX convention)
    if (c === '%') { while (i < len && src[i] !== '\n') i++; continue; }

    // Backslash command
    if (c === '\\') {
      i++;
      // \\  → row separator (double backslash)
      if (src[i] === '\\') { push(MT.NEWLINE, '\\\\'); i++; continue; }
      // \{  \}  \$  \%  \#  \&  \_  \,  \;  \:  \!  → escaped literal command
      if (i < len && /[{}$%#&_,;:! ]/.test(src[i])) {
        push(MT.COMMAND, src[i]); i++; continue;
      }
      // \command  (letters only, case-sensitive)
      let name = '';
      while (i < len && /[a-zA-Z]/.test(src[i])) name += src[i++];
      if (!name) {
        errors.push({ message: `Stray backslash at position ${i}` });
        continue;
      }
      // \text{...} \mathrm{...} \operatorname{...} — capture raw text verbatim,
      // never re-tokenized as math (handled here, not deferred to the parser,
      // so the token stream never contains mis-tokenized text fragments)
      if (name === 'text' || name === 'mathrm' || name === 'operatorname') {
        push(MT.COMMAND, name);
        // Skip whitespace, then expect a '{' — capture verbatim to matching '}'
        let j = i;
        while (j < len && /\s/.test(src[j])) j++;
        if (src[j] === '{') {
          let depth = 1; let k = j + 1; let text = '';
          while (k < len && depth > 0) {
            if (src[k] === '\\' && (src[k + 1] === '{' || src[k + 1] === '}')) {
              text += src[k + 1]; k += 2; continue;
            }
            if (src[k] === '{') depth++;
            else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
            text += src[k]; k++;
          }
          push(MT.LBRACE, '{');
          push(MT.TEXT, text);
          push(MT.RBRACE, '}');
          i = k;
        }
        continue;
      }
      push(MT.COMMAND, name);
      continue;
    }

    // Grouping
    if (c === '{') { push(MT.LBRACE, '{'); i++; continue; }
    if (c === '}') { push(MT.RBRACE, '}'); i++; continue; }
    if (c === '[') { push(MT.LBRACKET, '['); i++; continue; }
    if (c === ']') { push(MT.RBRACKET, ']'); i++; continue; }

    // Superscript / subscript
    if (c === '^') { push(MT.CARET, '^'); i++; continue; }
    if (c === '_') { push(MT.UNDERSCORE, '_'); i++; continue; }

    // Matrix column separator
    if (c === '&') { push(MT.AMP, '&'); i++; continue; }

    // Numbers (integer or decimal, optionally starting with .)
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let num = '';
      while (i < len && /[0-9]/.test(src[i])) num += src[i++];
      if (src[i] === '.' && /[0-9]/.test(src[i + 1] ?? '')) {
        num += src[i++];
        while (i < len && /[0-9]/.test(src[i])) num += src[i++];
      }
      push(MT.NUMBER, num);
      continue;
    }

    // Single-letter identifier (multi-letter runs are implicit multiplication
    // of single-letter identifiers UNLESS immediately preceded by a command
    // that consumes a whole word, e.g. function names are matched by the
    // parser via command lookahead, not here)
    if (/[a-zA-Z]/.test(c)) { push(MT.IDENT, c); i++; continue; }

    // Single-char operators
    if (SINGLE_CHAR_OPS.has(c)) { push(MT.OP, c); i++; continue; }

    if (c === '(' || c === ')') { push(MT.OP, c); i++; continue; }

    // Unicode passthrough — treat as identifier (e.g. someone pastes π directly)
    if (c.codePointAt(0) > 127) { push(MT.IDENT, c); i++; continue; }

    // Unknown character — record as error but keep going (recovery)
    errors.push({ message: `Unexpected character '${c}' at position ${i}` });
    i++;
  }

  push(MT.EOF, null);
  return { tokens, errors };
}
