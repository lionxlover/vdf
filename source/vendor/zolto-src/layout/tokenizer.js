/**
 * Zolto Layout Engine — Tokenizer (Phase 8)
 *
 * Scans layout directives and attribute strings.
 */

export const KNOWN_LAYOUT_DIRECTIVES = new Set([
  'layout', 'header', 'main', 'footer', 'sidebar', 'navigation', 'section',
  'container', 'spacer', 'box', 'grid', 'cell', 'flex', 'item', 'stack',
  'canvas', 'layer', 'pages', 'page', 'presentation', 'slide', 'title', 'subtitle',
  'notes', 'responsive', 'breakpoint', 'text', 'image', 'line', 'shape', 'rect',
]);

/**
 * Parse a layout block directive attribute string.
 * Supports:
 *   key="value" / key='value'
 *   key=123 / key=true / key=false / key=auto / key=fill / key=page
 *   flag (boolean true)
 *   fluid(min, max) / clamp(min, val, max)
 *
 * @param {string} str
 * @returns {Record<string, any>}
 */
export function parseLayoutAttrStr(str) {
  const attrs = {};
  if (!str || !str.trim()) return attrs;

  const src = str.trim();
  let i = 0;

  function skipWS() {
    while (i < src.length && /[ \t]/.test(src[i])) i++;
  }

  function readQuoted(q) {
    i++; // skip open quote
    let val = '';
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\' && src[i + 1] === q) {
        val += q;
        i += 2;
        continue;
      }
      val += src[i++];
    }
    if (i < src.length) i++; // skip close quote
    return val;
  }

  while (i < src.length) {
    skipWS();
    if (i >= src.length) break;

    // Read key name
    let key = '';
    while (i < src.length && !/[ \t=]/.test(src[i])) {
      key += src[i++];
    }
    if (!key) break;

    skipWS();

    if (i >= src.length || src[i] !== '=') {
      attrs[key] = true;
      continue;
    }

    i++; // skip '='
    skipWS();
    if (i >= src.length) break;

    let val;
    if (src[i] === '"') {
      val = readQuoted('"');
    } else if (src[i] === "'") {
      val = readQuoted("'");
    } else {
      let raw = '';
      let depth = 0;
      while (i < src.length) {
        const c = src[i];
        if (c === '(') depth++;
        if (c === ')') depth--;
        if (depth === 0 && /[ \t]/.test(c)) break;
        raw += c;
        i++;
      }
      if (raw === 'true') val = true;
      else if (raw === 'false') val = false;
      else if (raw !== '' && !isNaN(Number(raw))) val = Number(raw);
      else val = raw;
    }

    attrs[key] = val;
  }

  return attrs;
}
