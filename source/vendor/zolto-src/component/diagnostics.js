/**
 * Zolto Component System Diagnostics — Phase 9
 *
 * Accumulates location-aware errors and warnings for components,
 * templates, macros, props, slots, conditionals, and loops.
 */

export class ComponentDiagnostics {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  error(code, message, meta = {}) {
    this.errors.push({
      code,
      message,
      line: meta.line || 1,
      column: meta.column || 1,
      name: meta.name || null,
    });
  }

  warn(code, message, meta = {}) {
    this.warnings.push({
      code,
      message,
      line: meta.line || 1,
      column: meta.column || 1,
      name: meta.name || null,
    });
  }

  merge(other) {
    if (!other) return;
    if (Array.isArray(other.errors)) this.errors.push(...other.errors);
    if (Array.isArray(other.warnings)) this.warnings.push(...other.warnings);
  }

  hasErrors() {
    return this.errors.length > 0;
  }
}

export const ComponentDiagnosticCode = Object.freeze({
  UNKNOWN_COMPONENT:   'E901',
  MISSING_REQ_PROP:    'E902',
  INVALID_PROP_TYPE:   'E903',
  UNDEFINED_SLOT:      'E904',
  DUPLICATE_COMPONENT: 'E905',
  RECURSION_DEPTH:     'E906',
  SYNTAX_ERROR:        'E907',
  DUPLICATE_SLOT:      'E908',
  UNKNOWN_MACRO:       'E909',
  INVALID_CONDITION:   'E910',
  INVALID_LOOP:        'E911',
  UNKNOWN_TEMPLATE:    'E912',
});
