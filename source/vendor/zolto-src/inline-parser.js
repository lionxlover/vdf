/**
 * Zolto Inline Parser — Phase 4
 *
 * Phase 1: bold · italic · bold-italic · inline-code · strikethrough
 *           links · images · auto-links · backslash-escapes · hard/soft breaks
 *           variable refs · footnote refs
 *
 * Phase 2 adds:
 *   ^superscript^        → <sup>
 *   ~subscript~          → <sub>  (try ~~strike~~ first)
 *   ==highlight==        → <mark>
 *   [[kbd text]]         → <kbd>
 *   &entity; / &#123;    → html_entity node (verbatim in output)
 *   ---  --  ...         → smart dashes / ellipsis (in text buffer)
 *   [text][id]  [id][]   → reference links (resolved via opts.refs)
 *
 * Phase 4 adds:
 *   $expr$               → inline math (Pandoc-style currency-safe delimiter
 *                           matching: a candidate closing $ is rejected if
 *                           immediately followed by a digit, so "$10 or $20"
 *                           never triggers math mode)
 *   @ref(label)          → equation cross-reference
 */

import * as AST          from './ast.js';
import { Tokenizer, HTML_ENTITIES } from './tokenizer.js';
import { parseMath }     from './math-parser.js';

const ESCAPABLE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

/**
 * @param {string}  src
 * @param {object}  [opts]
 * @param {Map}     [opts.refs]     id → {href, title} for reference links
 * @param {Map}     [opts.variables] name → value
 * @param {boolean} [opts.smartPunctuation=true]
 * @returns {AST.Node[]}
 */
export function parseInline(src, opts = {}) {
  if (!src) return [];
  return new InlineParser(src, opts).parse();
}

// ─── Smart punctuation ────────────────────────────────────────────────────────

function applySmart(str, enabled) {
  if (!enabled) return str;
  return str
    .replace(/---/g, '\u2014')   // em dash
    .replace(/--/g,  '\u2013')   // en dash
    .replace(/\.\.\./g, '\u2026'); // ellipsis
}

// ─── InlineParser ─────────────────────────────────────────────────────────────

class InlineParser {
  constructor(src, opts) {
    this.t    = new Tokenizer(src);
    this.opts = opts;
    this.nodes = [];
    this.buf   = '';
    this.smart = opts.smartPunctuation !== false;
  }

  get src() { return this.t.src; }
  get pos() { return this.t.pos; }
  set pos(v) { this.t.pos = v; }
  get len() { return this.t.len; }

  ch(o = 0)        { return this.t.ch(o); }
  advance(n = 1)   { return this.t.advance(n); }
  startsWith(s)    { return this.t.startsWith(s); }
  save()           { return this.t.save(); }
  restore(p)       { this.t.restore(p); }
  eof()            { return this.t.eof; }

  flush() {
    if (this.buf) {
      const processed = applySmart(this.buf, this.smart);
      this.nodes.push(AST.text(processed));
      this.buf = '';
    }
  }

  push(node) { this.flush(); this.nodes.push(node); }

  // ── Main loop ──────────────────────────────────────────────────────────

  parse() {
    while (!this.eof()) this.step();
    this.flush();
    return this.nodes;
  }

  step() {
    const c = this.ch();

    // Backslash escape
    if (c === '\\') {
      const n = this.ch(1);
      if (n && ESCAPABLE.test(n)) { this.advance(2); this.buf += n; return; }
      if (n === '\n') { this.advance(2); this.push(AST.linebreak()); return; }
    }

    // HTML entity  &name;  &#123;  &#xAB;  (Phase 2)
    if (c === '&') { if (this.tryHtmlEntity()) return; }

    // Inline code (backticks — no smart punctuation inside)
    if (c === '`') { if (this.tryCode()) return; }

    // Bold-italic *** / ___ — try longest first
    if (c === '*' || c === '_') {
      const run = (() => { let n = 0; while (this.ch(n) === c) n++; return n; })();
      for (let n = Math.min(run, 3); n >= 1; n--) {
        if (this.tryEmphasis(c.repeat(n))) return;
      }
      this.buf += this.advance(); return;
    }

    // Strikethrough ~~  or  subscript ~  (Phase 2)
    if (c === '~') {
      if (this.startsWith('~~') && this.tryStrike()) return;
      if (this.trySubscript())                       return;
    }

    // Superscript ^text^  (Phase 2)
    if (c === '^') { if (this.trySuperscript()) return; }

    // Highlight ==text==  (Phase 2)
    if (c === '=' && this.startsWith('==')) { if (this.tryHighlight()) return; }

    // Keyboard key [[text]]  (Phase 2)
    if (c === '[' && this.startsWith('[[')) { if (this.tryKbd()) return; }

    // Variable reference  {{name}}
    if (c === '{' && this.startsWith('{{')) { if (this.tryVarRef()) return; }

    // Footnote reference  [^id]
    if (c === '[' && this.ch(1) === '^') { if (this.tryFootnoteRef()) return; }

    // Image  ![alt](src)
    if (c === '!' && this.ch(1) === '[') { if (this.tryImage()) return; }

    // Inline math  $expr$  (Phase 4) — currency-safe delimiter matching
    if (c === '$') { if (this.tryInlineMath()) return; }

    // Equation cross-reference  @ref(label)  (Phase 4)
    if (c === '@' && this.startsWith('@ref(')) { if (this.tryMathRef()) return; }

    // Link  [text](url)  or  [text][id]  or  [id][]
    if (c === '[') { if (this.tryLink()) return; }

    // Auto-link  <url>  <email>
    if (c === '<') { if (this.tryAutoLink()) return; }

    // Line break
    if (c === '\n') {
      const hard = this.buf.endsWith('  ') || this.buf.endsWith('\t');
      if (hard) this.buf = this.buf.replace(/[ \t]+$/, '');
      this.flush();
      this.push(hard ? AST.linebreak() : AST.softbreak());
      this.advance(); return;
    }

    this.buf += this.advance();
  }

  // ── HTML entity  (Phase 2) ─────────────────────────────────────────────

  tryHtmlEntity() {
    const saved = this.save();
    this.advance(); // skip &
    // Named entity  &alpha;
    const nameM = /^([a-zA-Z][a-zA-Z0-9]{0,31});/.exec(this.t.remaining());
    if (nameM && (nameM[1] in HTML_ENTITIES || ['amp','lt','gt','quot','apos'].includes(nameM[1]))) {
      this.pos += nameM[0].length;
      this.push(AST.htmlEntity(nameM[1]));
      return true;
    }
    // Decimal  &#123;
    const decM = /^#(\d{1,7});/.exec(this.t.remaining());
    if (decM) { this.pos += decM[0].length; this.push(AST.htmlEntity(`#${decM[1]}`)); return true; }
    // Hex  &#x1F600;
    const hexM = /^#[xX]([0-9A-Fa-f]{1,6});/.exec(this.t.remaining());
    if (hexM) { this.pos += hexM[0].length; this.push(AST.htmlEntity(`#x${hexM[1]}`)); return true; }

    this.restore(saved);
    return false;
  }

  // ── Inline code ────────────────────────────────────────────────────────

  tryCode() {
    const saved = this.save();
    let ticks = 0; while (this.ch(ticks) === '`') ticks++;
    const open = '`'.repeat(ticks); this.advance(ticks);
    const closeRel = this.findTicks(open);
    if (closeRel === -1) { this.restore(saved); return false; }
    let content = this.src.slice(this.pos, this.pos + closeRel);
    this.advance(closeRel + ticks);
    if (content.length > 2 && content[0] === ' ' && content[content.length - 1] === ' ')
      content = content.slice(1, -1);
    this.push(AST.inlineCode(content));
    return true;
  }

  findTicks(open) {
    const tl = open.length; let j = 0;
    while (this.pos + j < this.len) {
      const c = this.src[this.pos + j];
      if (c === '`') {
        let run = 0; while (this.src[this.pos + j + run] === '`') run++;
        if (run === tl) return j; j += run;
      } else j++;
    }
    return -1;
  }

  // ── Emphasis ───────────────────────────────────────────────────────────

  tryEmphasis(delim) {
    const saved = this.save(); const dl = delim.length; const ch = delim[0];
    if (!this.startsWith(delim)) return false;
    const nextCh = this.src[this.pos + dl] ?? '';
    if (!nextCh || /\s/.test(nextCh)) return false;
    if (ch === '_') { const prev = this.pos > 0 ? this.src[this.pos-1] : '\0'; if (/[a-zA-Z0-9]/.test(prev)) return false; }
    this.advance(dl);
    const closeRel = this.findClosingDelim(delim);
    if (closeRel === -1) { this.restore(saved); return false; }
    const inner = this.src.slice(this.pos, this.pos + closeRel);
    this.advance(closeRel + dl);
    const children = parseInline(inner, this.opts);
    this.push(dl === 1 ? AST.italic(children) : dl === 2 ? AST.bold(children) : AST.bold([AST.italic(children)]));
    return true;
  }

  findClosingDelim(delim) {
    const dl = delim.length; const ch = delim[0]; const src = this.src; let j = 0;
    while (this.pos + j < this.len) {
      const c = src[this.pos + j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') {
        let ticks = 0; while (src[this.pos+j+ticks] === '`') ticks++;
        const op = '`'.repeat(ticks); j += ticks;
        while (this.pos+j < this.len) {
          if (src.startsWith(op, this.pos+j) && src[this.pos+j+ticks] !== '`') { j += ticks; break; } j++;
        }
        continue;
      }
      if (c === ch) {
        let run = 0; while (src[this.pos+j+run] === ch) run++;
        // Only an EXACT run-length match closes this delimiter. A longer or
        // shorter run (e.g. ** encountered while closing single *) is treated
        // as a nested delimiter pair and skipped over, so `*a **b** c*` finds
        // its true closing star after the nested bold span instead of
        // terminating prematurely at the first asterisk of "**".
        if (run === dl) {
          if (ch === '_') { const after = src[this.pos+j+run] ?? ''; if (/[a-zA-Z0-9]/.test(after)) { j += run; continue; } }
          return j;
        }
        j += run; continue;
      }
      j++;
    }
    return -1;
  }

  // ── Strikethrough ──────────────────────────────────────────────────────

  tryStrike() {
    const saved = this.save(); this.advance(2);
    const ci = this.src.indexOf('~~', this.pos);
    if (ci === -1 || ci === this.pos) { this.restore(saved); return false; }
    const inner = this.src.slice(this.pos, ci); this.pos = ci + 2;
    this.push(AST.strikethrough(parseInline(inner, this.opts))); return true;
  }

  // ── Subscript  ~text~  (Phase 2) ──────────────────────────────────────

  trySubscript() {
    const saved = this.save(); this.advance(1);
    if (this.ch() === '~' || this.eof() || /\s/.test(this.ch())) { this.restore(saved); return false; }
    const ci = this.src.indexOf('~', this.pos);
    if (ci === -1 || ci === this.pos || /\s/.test(this.src[ci - 1])) { this.restore(saved); return false; }
    const inner = this.src.slice(this.pos, ci); this.pos = ci + 1;
    this.push(AST.subscript(parseInline(inner, this.opts))); return true;
  }

  // ── Superscript  ^text^  (Phase 2) ────────────────────────────────────

  trySuperscript() {
    const saved = this.save(); this.advance(1);
    if (this.eof() || /\s/.test(this.ch())) { this.restore(saved); return false; }
    const ci = this.src.indexOf('^', this.pos);
    if (ci === -1 || ci === this.pos) { this.restore(saved); return false; }
    const inner = this.src.slice(this.pos, ci); this.pos = ci + 1;
    this.push(AST.superscript(parseInline(inner, this.opts))); return true;
  }

  // ── Highlight  ==text==  (Phase 2) ────────────────────────────────────

  tryHighlight() {
    const saved = this.save(); this.advance(2);
    const ci = this.src.indexOf('==', this.pos);
    if (ci === -1 || ci === this.pos) { this.restore(saved); return false; }
    const inner = this.src.slice(this.pos, ci); this.pos = ci + 2;
    this.push(AST.highlight(parseInline(inner, this.opts))); return true;
  }

  // ── Keyboard key  [[key]]  (Phase 2) ──────────────────────────────────

  tryKbd() {
    const saved = this.save(); this.advance(2);
    const ci = this.src.indexOf(']]', this.pos);
    if (ci === -1 || ci === this.pos) { this.restore(saved); return false; }
    const inner = this.src.slice(this.pos, ci).trim(); this.pos = ci + 2;
    if (!inner) { this.restore(saved); return false; }
    this.push(AST.kbd(inner)); return true;
  }

  // ── Variable reference  {{name}} ──────────────────────────────────────

  tryVarRef() {
    const saved = this.save(); this.advance(2);
    const ci = this.src.indexOf('}}', this.pos);
    if (ci === -1) { this.restore(saved); return false; }
    const name = this.src.slice(this.pos, ci).trim(); this.pos = ci + 2;
    if (/^[\w$][\w$-]*$/.test(name)) { this.push(AST.variableRef(name)); return true; }
    this.restore(saved); return false;
  }

  // ── Footnote reference  [^id] ─────────────────────────────────────────

  tryFootnoteRef() {
    const saved = this.save(); this.advance(2);
    const ci = this.src.indexOf(']', this.pos);
    if (ci === -1) { this.restore(saved); return false; }
    const id = this.src.slice(this.pos, ci).trim(); this.pos = ci + 1;
    if (id) { this.push(AST.footnoteRef(id, 0)); return true; }
    this.restore(saved); return false;
  }

  // ── Inline math  $expr$  (Phase 4) ──────────────────────────────────────
  //
  // Currency-safe delimiter matching (Pandoc's tex_math_dollars rule):
  //   a) opening $ must NOT be followed by whitespace
  //   b) the candidate closing $ must NOT be preceded by whitespace
  //   c) the candidate closing $ must NOT be immediately followed by a digit
  //      — this is what correctly rejects "It costs $10 or $20": the first
  //      candidate closer (before "20") is followed by '2', so it's rejected,
  //      and since no OTHER $ exists before the paragraph ends, the whole
  //      span falls back to literal text.
  //   d) the span must not cross a blank-line (paragraph) boundary

  tryInlineMath() {
    const saved = this.save();
    this.advance(); // opening $
    if (/\s/.test(this.ch())) { this.restore(saved); return false; }

    let searchFrom = this.pos;
    for (;;) {
      const ci = this.src.indexOf('$', searchFrom);
      if (ci === -1) { this.restore(saved); return false; }
      const before = this.src[ci - 1];
      const after  = this.src[ci + 1] ?? '';
      const crossesBlankLine = this.src.slice(this.pos, ci).includes('\n\n');
      if (crossesBlankLine) { this.restore(saved); return false; }
      if (/\s/.test(before) || /[0-9]/.test(after)) { searchFrom = ci + 1; continue; }
      // Valid closing delimiter found.
      const content = this.src.slice(this.pos, ci);
      this.pos = ci + 1;
      const { ast, errors } = parseMath(content);
      this.push(AST.mathInline(content, ast, { parseErrors: errors }));
      return true;
    }
  }

  // ── Equation cross-reference  @ref(label)  (Phase 4) ────────────────────

  tryMathRef() {
    const saved = this.save(); this.advance(5); // '@ref('
    const ci = this.src.indexOf(')', this.pos);
    if (ci === -1) { this.restore(saved); return false; }
    const id = this.src.slice(this.pos, ci).trim(); this.pos = ci + 1;
    if (!id) { this.restore(saved); return false; }
    this.push(AST.mathRef(id));
    return true;
  }

  // ── Image  ![alt](src "title") ────────────────────────────────────────

  tryImage() {
    const saved = this.save(); this.advance(2);
    const ae = this.matchBracket(); if (ae === -1) { this.restore(saved); return false; }
    const alt = this.src.slice(this.pos, this.pos + ae); this.advance(ae + 1);
    if (this.ch() !== '(') { this.restore(saved); return false; }
    this.advance(1);
    const de = this.matchParen(); if (de === -1) { this.restore(saved); return false; }
    const dest = this.src.slice(this.pos, this.pos + de).trim(); this.advance(de + 1);
    const { href: src2, title } = parseLinkDest(dest);
    this.push(AST.image(src2, alt, { title, lazy: true })); return true;
  }

  // ── Link  [text](url)  or  [text][id]  or  [id][]  (Phase 2) ─────────

  tryLink() {
    const saved = this.save(); this.advance(1);
    const te = this.matchBracket(); if (te === -1) { this.restore(saved); return false; }
    const textSrc = this.src.slice(this.pos, this.pos + te); this.advance(te + 1);

    // Inline link  [text](url)
    if (this.ch() === '(') {
      this.advance(1);
      const de = this.matchParen(); if (de === -1) { this.restore(saved); return false; }
      const dest = this.src.slice(this.pos, this.pos + de).trim(); this.advance(de + 1);
      const { href, title } = parseLinkDest(dest);
      const children = parseInline(textSrc, this.opts);
      this.push(AST.link(href, children, title)); return true;
    }

    // Reference link  [text][id]  or  [id][]  (Phase 2)
    if (this.ch() === '[') {
      const rSaved = this.save(); this.advance(1);
      const re = this.matchBracket();
      if (re !== -1) {
        const refId = this.src.slice(this.pos, this.pos + re).trim().toLowerCase(); this.advance(re + 1);
        const lookupId = refId || textSrc.toLowerCase(); // [id][] → use text as key
        const refs = this.opts.refs;
        if (refs && refs.has(lookupId)) {
          const ref = refs.get(lookupId);
          const children = parseInline(textSrc, this.opts);
          this.push(AST.link(ref.href, children, ref.title)); return true;
        }
        // Unresolved reference — emit as refLink for diagnostics
        this.push(AST.refLink(lookupId, parseInline(textSrc, this.opts))); return true;
      }
      this.restore(rSaved);
    }

    this.restore(saved); return false;
  }

  // ── Auto-link ──────────────────────────────────────────────────────────

  tryAutoLink() {
    const saved = this.save(); this.advance(1);
    const ci = this.src.indexOf('>', this.pos);
    if (ci === -1) { this.restore(saved); return false; }
    const content = this.src.slice(this.pos, ci);
    if (/\s/.test(content) || !content) { this.restore(saved); return false; }
    const isUrl   = /^[A-Za-z][A-Za-z\d+.-]{1,31}:/.test(content);
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(content);
    if (!isUrl && !isEmail) { this.restore(saved); return false; }
    this.pos = ci + 1;
    const href = isEmail && !content.startsWith('mailto:') ? `mailto:${content}` : content;
    this.push(AST.link(href, [AST.text(content)])); return true;
  }

  // ── Bracket / paren helpers ────────────────────────────────────────────

  matchBracket() {
    let depth = 0; let j = 0;
    while (this.pos + j < this.len) {
      const c = this.src[this.pos + j];
      if (c === '\\') { j += 2; continue; }
      if (c === '[') depth++; if (c === ']') { if (depth === 0) return j; depth--; } j++;
    }
    return -1;
  }

  matchParen() {
    let depth = 0; let j = 0;
    while (this.pos + j < this.len) {
      const c = this.src[this.pos + j];
      if (c === '\\') { j += 2; continue; }
      if (c === '(') depth++; if (c === ')') { if (depth === 0) return j; depth--; } j++;
    }
    return -1;
  }
}

// ─── Link destination parser ──────────────────────────────────────────────────

function parseLinkDest(inner) {
  if (!inner) return { href: '', title: null };
  const angle = inner.match(/^<([^>]*)>(.*)/);
  if (angle) return { href: angle[1], title: parseLinkTitle(angle[2].trim()) };
  let depth = 0; let i = 0;
  while (i < inner.length) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') depth--;
    else if (inner[i] === ' ' && depth === 0) break;
    i++;
  }
  return { href: inner.slice(0, i), title: parseLinkTitle(inner.slice(i).trim()) };
}

function parseLinkTitle(str) {
  if (!str) return null;
  const m = str.match(/^"([^"]*)"$/) || str.match(/^'([^']*)'$/) || str.match(/^\(([^)]*)\)$/);
  return m ? m[1] : null;
}
