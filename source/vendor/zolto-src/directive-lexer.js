/**
 * Zolto Directive Lexer — Phase 3
 *
 * Handles the universal @directive … @/directive block syntax.
 *
 * Syntax:
 *   @name [firstArg] [key=value] [key="value"] [flag]
 *   body content (nested Markdown or child directives)
 *   @/name
 *
 * All Phase 3 directives use the block form (open + close tags).
 * There are no self-closing tags; leaf directives simply have empty bodies.
 */

// ─── Known directives ─────────────────────────────────────────────────────────

export const KNOWN_DIRECTIVES = new Set([
  'embed','collapse','tabs','tab','card','card-group',
  'steps','step','columns','column','badge','tag',
  'alert','timeline','event','progress','avatar','icon',
]);

/**
 * Directives that contain named child directives (not free-form Markdown).
 * Maps container → expected child directive name.
 */
export const CHILD_MAP = Object.freeze({
  'tabs':       'tab',
  'steps':      'step',
  'columns':    'column',
  'card-group': 'card',
  'timeline':   'event',
});

// ─── Attribute string parser ───────────────────────────────────────────────────

/**
 * Parse a directive attribute string into a structured object.
 *
 * Supports:
 *   key="value"    → string
 *   key='value'    → string
 *   key=value      → string (or number/boolean if parseable)
 *   key=true|false → boolean
 *   key=42         → number
 *   flag           → boolean true (no = present)
 *   firstArg       → stored as attrs._first if the first token has no =
 *
 * @param {string} str
 * @returns {{ _first: string|null, [key: string]: any }}
 */
export function parseAttrStr(str) {
  const attrs = { _first: null };
  if (!str || !str.trim()) return attrs;

  let i = 0;
  const src = str.trim();
  let firstSeen = false;

  function skipWS() { while (i < src.length && /[ \t]/.test(src[i])) i++; }

  function readToken() {
    let tok = '';
    while (i < src.length && !/[ \t=]/.test(src[i])) tok += src[i++];
    return tok;
  }

  function readQuoted(q) {
    i++; // skip opening quote
    let val = '';
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\' && src[i + 1] === q) { val += q; i += 2; continue; }
      val += src[i++];
    }
    if (i < src.length) i++; // skip closing quote
    return val;
  }

  while (i < src.length) {
    skipWS();
    if (i >= src.length) break;

    const key = readToken();
    if (!key) break;

    skipWS();

    if (src[i] !== '=') {
      // No value — boolean flag or first positional arg
      if (!firstSeen && !key.includes('-') && attrs._first === null) {
        // Treat as positional first arg only if it looks like a word (no special chars)
        if (/^[a-z][a-z0-9-]*$/i.test(key)) {
          attrs._first = key;
          firstSeen = true;
          continue;
        }
      }
      attrs[key] = true;
    } else {
      i++; // skip '='
      firstSeen = true; // named attr seen, disable first-positional logic
      let val;
      if (src[i] === '"') {
        val = readQuoted('"');
      } else if (src[i] === "'") {
        val = readQuoted("'");
      } else {
        let raw = '';
        while (i < src.length && !/[ \t]/.test(src[i])) raw += src[i++];
        if (raw === 'true')       val = true;
        else if (raw === 'false') val = false;
        else if (raw !== '' && !isNaN(Number(raw))) val = Number(raw);
        else val = raw;
      }
      attrs[key] = val;
    }
  }

  return attrs;
}

// ─── Child directive extractor ─────────────────────────────────────────────────

/**
 * Extract named child directive blocks from a body string.
 *
 * Given a body like:
 *   @tab label="First"\nContent\n@/tab\n@tab label="Second"\nContent 2\n@/tab
 *
 * Returns:
 *   [{ attrStr: 'label="First"', body: 'Content' }, ...]
 *
 * @param {string} bodyStr  Raw body content
 * @param {string} childName  e.g. 'tab', 'step', 'column'
 * @returns {Array<{ attrStr: string, body: string }>}
 */
export function extractChildren(bodyStr, childName) {
  const lines = bodyStr.split('\n');
  const openRe  = new RegExp(`^\\s*@${childName}(?:\\s+(.*))?\\s*$`);
  const closeRe = new RegExp(`^\\s*@\\/${childName}\\s*$`);
  const results  = [];
  let i = 0;

  while (i < lines.length) {
    const m = openRe.exec(lines[i]);
    if (m) {
      const attrStr   = (m[1] ?? '').trim();
      const bodyLines = [];
      let depth = 1;
      i++;
      while (i < lines.length && depth > 0) {
        if (openRe.test(lines[i]))  depth++;
        if (closeRe.test(lines[i])) { depth--; if (depth === 0) { i++; break; } }
        if (depth > 0) bodyLines.push(lines[i]);
        i++;
      }
      results.push({ attrStr, body: bodyLines.join('\n') });
    } else {
      i++;
    }
  }

  return results;
}

// ─── Block lexer ──────────────────────────────────────────────────────────────

/**
 * Lex a single directive block starting at `lines[startI]`.
 *
 * @param {string[]} lines   All source lines
 * @param {number}   startI  Index of the opening @name line
 * @param {string}   name    Directive name
 * @param {string}   attrStr Everything on the opening line after `@name`
 * @returns {{ tok: DirectiveToken, nextI: number }}
 */
export function lexDirective(lines, startI, name, attrStr) {
  const closeTag = `@/${name}`;
  const openTag  = `@${name}`;
  const bodyLines = [];
  let i     = startI + 1;
  let depth = 1;

  while (i < lines.length) {
    const stripped = lines[i].trimStart();

    // Count nesting by tracking same-name opens and closes
    if (stripped.startsWith(openTag) && (stripped[openTag.length] === undefined || /[\s/]/.test(stripped[openTag.length]))) {
      depth++;
    }
    if (stripped === closeTag || stripped.startsWith(closeTag + ' ')) {
      depth--;
      if (depth === 0) { i++; break; }
    }

    bodyLines.push(lines[i]);
    i++;
  }

  const tok = {
    type:    'directive',
    name,
    attrStr: attrStr.trim(),
    body:    bodyLines.join('\n'),
    raw:     lines.slice(startI, i).join('\n'),
  };

  return { tok, nextI: i };
}
