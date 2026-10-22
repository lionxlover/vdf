/**
 * Zolto Diagnostics — Phase 2
 *
 * Structured error / warning / info collection for parse-time analysis.
 * The validator uses this to accumulate issues and the public API surfaces
 * them as human-readable strings alongside the AST.
 */

// ─── Severity ─────────────────────────────────────────────────────────────────

export const Severity = Object.freeze({
  ERROR:   'error',
  WARNING: 'warning',
  INFO:    'info',
});

// ─── Error / warning codes ────────────────────────────────────────────────────

export const Code = Object.freeze({
  // Lexer / parser errors  (E-series)
  UNCLOSED_FENCE:       'E001',
  UNCLOSED_COMMENT:     'E002',
  UNCLOSED_ADMONITION:  'E003',
  MALFORMED_TABLE:      'E004',
  INVALID_FRONTMATTER:  'E005',
  UNEXPECTED_TOKEN:     'E006',

  // Validator warnings  (W-series)
  UNDEFINED_VAR:        'W001',
  UNDEFINED_FOOTNOTE:   'W002',
  UNDEFINED_REFERENCE:  'W003',
  DUPLICATE_REF_ID:     'W004',
  DUPLICATE_HEADING_ID: 'W005',
  DUPLICATE_FOOTNOTE:   'W006',
  UNKNOWN_ADMON_TYPE:   'W007',
  UNUSED_REFERENCE:     'W008',
  INVALID_IMAGE_SRC:    'W009',
  BROKEN_REF_LINK:      'W010',

  // Phase 3 directive warnings
  MISSING_EMBED_SRC:    'W011',
  PROGRESS_OUT_OF_RANGE:'W012',
  EMPTY_DIRECTIVE_BODY: 'W013',

  // Phase 4 math warnings/errors
  UNKNOWN_MATH_COMMAND: 'M001',
  UNCLOSED_MATH_ENV:    'M002',
  MISMATCHED_MATH_ENV:  'M003',
  DUPLICATE_EQ_LABEL:   'M004',
  UNDEFINED_EQ_REF:     'M005',
  MATH_PARSE_ERROR:     'M006',

  // Informational  (I-series)
  BARE_LINK:            'I001',
  EMPTY_ALT:            'I002',
  DEPRECATED_SYNTAX:    'I003',
});

// ─── Diagnostic item shape ────────────────────────────────────────────────────

/**
 * @typedef DiagnosticItem
 * @property {string}      severity  'error' | 'warning' | 'info'
 * @property {string}      code      One of Code.*
 * @property {string}      message   Human-readable description
 * @property {number|null} line      Source line (1-based), null if unknown
 * @property {number|null} col       Source column (1-based), null if unknown
 * @property {string|null} source    Relevant source fragment
 */

// ─── Diagnostics collector ────────────────────────────────────────────────────

export class Diagnostics {
  constructor() {
    /** @type {DiagnosticItem[]} */
    this.items = [];
  }

  /**
   * Add an item directly.
   * @param {string} severity
   * @param {string} code
   * @param {string} message
   * @param {object} [opts]
   * @param {number} [opts.line]
   * @param {number} [opts.col]
   * @param {string} [opts.source]
   * @returns {this}
   */
  add(severity, code, message, opts = {}) {
    this.items.push({
      severity,
      code,
      message,
      line:   opts.line   ?? null,
      col:    opts.col    ?? null,
      source: opts.source ?? null,
    });
    return this;
  }

  /** @returns {this} */
  error(code, message, opts = {}) { return this.add(Severity.ERROR,   code, message, opts); }
  /** @returns {this} */
  warn(code,  message, opts = {}) { return this.add(Severity.WARNING, code, message, opts); }
  /** @returns {this} */
  info(code,  message, opts = {}) { return this.add(Severity.INFO,    code, message, opts); }

  get errors()   { return this.items.filter(d => d.severity === Severity.ERROR);   }
  get warnings() { return this.items.filter(d => d.severity === Severity.WARNING); }
  get infos()    { return this.items.filter(d => d.severity === Severity.INFO);    }

  hasErrors()    { return this.errors.length   > 0; }
  hasWarnings()  { return this.warnings.length > 0; }

  /** @returns {DiagnosticItem[]} */
  toArray()      { return [...this.items]; }

  /** @returns {string[]} */
  toErrorStrings() {
    return this.errors.map(d =>
      `[${d.code}] ${d.message}${d.line != null ? ` (line ${d.line})` : ''}`
    );
  }

  /** @returns {string[]} */
  toWarningStrings() {
    return this.warnings.map(d =>
      `[${d.code}] ${d.message}${d.line != null ? ` (line ${d.line})` : ''}`
    );
  }

  /**
   * Merge items from another Diagnostics instance into this one.
   * @param {Diagnostics} other
   * @returns {this}
   */
  merge(other) {
    this.items.push(...other.items);
    return this;
  }

  /** Return a plain summary string for quick debugging. */
  toString() {
    const e = this.errors.length;
    const w = this.warnings.length;
    if (e + w === 0) return 'No issues';
    const parts = [];
    if (e) parts.push(`${e} error${e !== 1 ? 's' : ''}`);
    if (w) parts.push(`${w} warning${w !== 1 ? 's' : ''}`);
    return parts.join(', ');
  }
}

/**
 * Convert a flat { errors: string[], warnings: string[] } result (Phase 1 style)
 * into a Diagnostics instance for interop.
 * @param {{ errors?: string[], warnings?: string[] }} plain
 * @returns {Diagnostics}
 */
export function fromPlain(plain) {
  const d = new Diagnostics();
  for (const msg of plain.errors   ?? []) d.error(Code.UNEXPECTED_TOKEN, msg);
  for (const msg of plain.warnings ?? []) d.warn(Code.UNDEFINED_VAR,     msg);
  return d;
}
