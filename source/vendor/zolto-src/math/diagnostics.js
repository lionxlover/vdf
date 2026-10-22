/**
 * Zolto Math Diagnostics — Phase 4
 */

export class MathDiagnostic {
  constructor(code, message, severity = 'error', opts = {}) {
    this.code     = code;
    this.message  = message;
    this.severity = severity; // 'error' | 'warning'
    this.line     = opts.line ?? null;
    this.char     = opts.char ?? null;
  }

  toString() {
    const loc = this.line !== null ? ` (line ${this.line})` : '';
    return `[${this.code}] ${this.severity.toUpperCase()}: ${this.message}${loc}`;
  }
}

export class MathDiagnostics {
  constructor() {
    this.items = [];
  }

  error(code, message, opts = {}) {
    this.items.push(new MathDiagnostic(code, message, 'error', opts));
  }

  warn(code, message, opts = {}) {
    this.items.push(new MathDiagnostic(code, message, 'warning', opts));
  }

  get errors() {
    return this.items.filter(x => x.severity === 'error');
  }

  get warnings() {
    return this.items.filter(x => x.severity === 'warning');
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}
