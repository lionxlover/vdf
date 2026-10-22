/**
 * Zolto Interactive Diagnostics — Phase 10
 *
 * Lightweight diagnostic collector for the interactive engine.
 * No-throw guarantee: all methods are safe to call on invalid input.
 */

export class InteractiveDiagnostics {
  constructor() {
    this._entries = [];
  }

  error(code, message, context = {}) {
    this._entries.push({ severity: 'error', code: String(code), message: String(message), context });
    return this;
  }

  warn(code, message, context = {}) {
    this._entries.push({ severity: 'warning', code: String(code), message: String(message), context });
    return this;
  }

  info(code, message, context = {}) {
    this._entries.push({ severity: 'info', code: String(code), message: String(message), context });
    return this;
  }

  get errors()   { return this._entries.filter(e => e.severity === 'error'); }
  get warnings() { return this._entries.filter(e => e.severity === 'warning'); }
  get infos()    { return this._entries.filter(e => e.severity === 'info'); }
  get all()      { return [...this._entries]; }
  get hasErrors(){ return this._entries.some(e => e.severity === 'error'); }

  merge(other) {
    if (other instanceof InteractiveDiagnostics) {
      this._entries.push(...other._entries);
    }
    return this;
  }

  toJSON() {
    return this._entries.map(e => ({
      severity: e.severity,
      code:     e.code,
      message:  e.message,
      context:  e.context,
    }));
  }
}
