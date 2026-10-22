/**
 * Zolto Interactive Data Bindings — Phase 10
 *
 * Declarative, safe data binding system.
 * No eval, no arbitrary code execution, no prototype access.
 */

import { isUnsafeExpr, resolveBinding } from './state.js';

// ─── Binding extraction ───────────────────────────────────────────────────────

/**
 * Extract all binding expressions from a text string.
 * Only extracts safe identifier patterns: {varName} or {var.field}
 * @param {string} text
 * @returns {string[]} Array of binding expression strings (without braces)
 */
export function extractBindings(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = [];
  const re = /\{\s*([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const expr = m[1].trim();
    if (!isUnsafeExpr(expr)) {
      matches.push(expr);
    }
  }
  return [...new Set(matches)];
}

/**
 * Interpolate binding expressions in a text string using a state map.
 * Expressions that cannot be resolved remain as-is (no destruction).
 * @param {string} text
 * @param {Map} stateMap
 * @returns {string}
 */
export function interpolateBindings(text, stateMap) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\{\s*([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\}/g, (match, expr) => {
    if (isUnsafeExpr(expr)) return match;
    const val = resolveBinding(expr, stateMap);
    return val !== '' ? val : match;
  });
}

// ─── Computed display values ──────────────────────────────────────────────────

/**
 * Compute a display value for a binding expression.
 * @param {string} expr
 * @param {Map} stateMap
 * @returns {string}
 */
export function computeDisplayValue(expr, stateMap) {
  if (!expr) return '';
  if (isUnsafeExpr(expr)) return '';
  return resolveBinding(expr, stateMap);
}

// ─── Dependency tracking ──────────────────────────────────────────────────────

/**
 * Build a dependency graph: which bindings are used in which node IDs.
 * @param {object[]} nodes   Flat list of interactive AST nodes
 * @returns {Map<string, Set<string>>} expr → set of node IDs that use it
 */
export function buildDependencyGraph(nodes) {
  const graph = new Map();

  function processNode(node) {
    if (!node || typeof node !== 'object') return;
    // Check common text fields
    for (const field of ['label', 'placeholder', 'value', 'help', 'error', 'question', 'text']) {
      const text = node[field];
      if (typeof text === 'string') {
        for (const expr of extractBindings(text)) {
          if (!graph.has(expr)) graph.set(expr, new Set());
          graph.get(expr).add(node.name || node.type || '?');
        }
      }
    }
    // Recurse into children
    for (const childField of ['children', 'options', 'questions', 'cards', 'items', 'tabs', 'sections']) {
      if (Array.isArray(node[childField])) {
        for (const child of node[childField]) processNode(child);
      }
    }
  }

  for (const node of (nodes || [])) processNode(node);
  return graph;
}
