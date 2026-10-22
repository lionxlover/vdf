/**
 * Zolto Chart Diagnostics & Validation Collector — Phase 6
 *
 * Collects structured errors and warnings during chart parsing and validation.
 */

export class ChartDiagnostic {
  constructor(severity, code, message, opts = {}) {
    this.severity = severity; // 'error' | 'warning'
    this.code = code;
    this.message = message;
    this.line = opts.line ?? null;
    this.column = opts.column ?? null;
    this.chartId = opts.chartId ?? null;
  }

  toString() {
    const loc = this.line ? ` (line ${this.line}${this.column ? `:${this.column}` : ''})` : '';
    return `[${this.severity.toUpperCase()} ${this.code}] ${this.message}${loc}`;
  }
}

export class ChartDiagnosticsCollector {
  constructor() {
    this.diagnostics = [];
  }

  error(code, message, opts = {}) {
    this.diagnostics.push(new ChartDiagnostic('error', code, message, opts));
  }

  warning(code, message, opts = {}) {
    this.diagnostics.push(new ChartDiagnostic('warning', code, message, opts));
  }

  hasErrors() {
    return this.diagnostics.some(d => d.severity === 'error');
  }

  hasWarnings() {
    return this.diagnostics.some(d => d.severity === 'warning');
  }

  getErrors() {
    return this.diagnostics.filter(d => d.severity === 'error');
  }

  getWarnings() {
    return this.diagnostics.filter(d => d.severity === 'warning');
  }

  formatErrors() {
    return this.getErrors().map(d => d.toString());
  }

  formatWarnings() {
    return this.getWarnings().map(d => d.toString());
  }
}
