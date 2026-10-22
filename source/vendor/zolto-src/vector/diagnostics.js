/**
 * Zolto Vector Graphics Diagnostic Collector — Phase 7
 *
 * Collects and reports error, warning, and info messages with exact line and column numbers.
 */

export const VectorDiagnosticCode = {
  E_UNKNOWN_KEYWORD: 'V001',
  E_INVALID_GEOMETRY: 'V002',
  E_DUPLICATE_ID: 'V003',
  E_MISSING_REF: 'V004',
  E_INVALID_PATH: 'V005',
  E_INVALID_TRANSFORM: 'V006',
  W_DEPRECATED_SYNTAX: 'V007',
  W_UNCLOSED_BLOCK: 'V008',
};

export class VectorDiagnostics {
  constructor() {
    this.entries = [];
  }

  add(severity, code, message, line = 1, column = 1) {
    this.entries.push({
      severity, // 'error' | 'warning' | 'info'
      code,
      message,
      line,
      column,
    });
  }

  error(code, message, line = 1, column = 1) {
    this.add('error', code, message, line, column);
  }

  warn(code, message, line = 1, column = 1) {
    this.add('warning', code, message, line, column);
  }

  getErrors() {
    return this.entries.filter(e => e.severity === 'error');
  }

  getWarnings() {
    return this.entries.filter(e => e.severity === 'warning');
  }

  hasErrors() {
    return this.entries.some(e => e.severity === 'error');
  }
}
