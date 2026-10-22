/**
 * Zolto Layout Engine — Diagnostics (Phase 8)
 *
 * Accumulates structural layout validation diagnostics (errors, warnings, info).
 */

export class LayoutDiagnostics {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  error(code, message, meta = {}) {
    this.errors.push({ code, message, severity: 'ERROR', ...meta });
  }

  warning(code, message, meta = {}) {
    this.warnings.push({ code, message, severity: 'WARNING', ...meta });
  }

  addInfo(code, message, meta = {}) {
    this.info.push({ code, message, severity: 'INFO', ...meta });
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}
