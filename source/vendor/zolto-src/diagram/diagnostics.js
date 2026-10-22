/**
 * Zolto Diagram Diagnostics — Phase 5
 *
 * Collects and formats diagnostic messages (errors & warnings) during
 * diagram tokenizing, parsing, validation, and rendering.
 */

export class DiagramDiagnostics {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  error(code, message, context = {}) {
    this.errors.push({
      code,
      message,
      line: context.line ?? null,
      column: context.column ?? null,
      nodeId: context.nodeId ?? null,
    });
  }

  warn(code, message, context = {}) {
    this.warnings.push({
      code,
      message,
      line: context.line ?? null,
      column: context.column ?? null,
      nodeId: context.nodeId ?? null,
    });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  hasWarnings() {
    return this.warnings.length > 0;
  }

  merge(other) {
    if (!other) return;
    if (Array.isArray(other.errors)) this.errors.push(...other.errors);
    if (Array.isArray(other.warnings)) this.warnings.push(...other.warnings);
  }

  formatErrors() {
    return this.errors.map(e => {
      const pos = e.line !== null ? ` (line ${e.line}${e.column ? `:${e.column}` : ''})` : '';
      return `[${e.code}] ${e.message}${pos}`;
    });
  }

  formatWarnings() {
    return this.warnings.map(w => {
      const pos = w.line !== null ? ` (line ${w.line}${w.column ? `:${w.column}` : ''})` : '';
      return `[${w.code}] ${w.message}${pos}`;
    });
  }
}
