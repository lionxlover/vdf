/**
 * Zolto Interactive State Model — Phase 10
 *
 * Unified state model for interactive documents.
 * No arbitrary scripting, no eval, no unsafe evaluation.
 * All state is typed, serializable, and deterministic.
 */

// ─── Document state creation ──────────────────────────────────────────────────

/**
 * Build a state map from a StateBlock AST node.
 * @param {object} stateNode  StateBlock AST node
 * @returns {Map<string, {value: *, type: string}>}
 */
export function createDocumentState(stateNode) {
  const state = new Map();
  if (!stateNode || !Array.isArray(stateNode.vars)) return state;
  for (const v of stateNode.vars) {
    state.set(v.name, { value: v.value, type: v.varType || inferType(v.value) });
  }
  return state;
}

/**
 * Merge multiple state maps (later maps override earlier ones).
 * @param {...Map} maps
 * @returns {Map}
 */
export function mergeStates(...maps) {
  const merged = new Map();
  for (const m of maps) {
    if (m instanceof Map) {
      for (const [k, v] of m) merged.set(k, v);
    }
  }
  return merged;
}

// ─── State updates ────────────────────────────────────────────────────────────

/**
 * Update a state value. Returns a new Map (immutable update).
 * @param {Map} stateMap
 * @param {string} key
 * @param {*} newValue
 * @returns {Map}
 */
export function updateState(stateMap, key, newValue) {
  const next = new Map(stateMap);
  const existing = next.get(key);
  if (existing) {
    next.set(key, { ...existing, value: coerce(newValue, existing.type) });
  } else {
    next.set(key, { value: newValue, type: inferType(newValue) });
  }
  return next;
}

// ─── Value coercion ───────────────────────────────────────────────────────────

function coerce(value, type) {
  if (type === 'boolean') return Boolean(value);
  if (type === 'number')  return Number(value);
  if (type === 'string')  return String(value);
  return value;
}

// ─── State serialization ──────────────────────────────────────────────────────

/**
 * Serialize a state map to a plain JSON-safe object.
 * @param {Map} stateMap
 * @returns {object}
 */
export function serializeState(stateMap) {
  const obj = {};
  for (const [k, v] of stateMap) {
    obj[k] = v.value;
  }
  return obj;
}

/**
 * Restore a state map from a plain object.
 * @param {object} obj
 * @returns {Map}
 */
export function deserializeState(obj) {
  const state = new Map();
  for (const [k, v] of Object.entries(obj || {})) {
    state.set(k, { value: v, type: inferType(v) });
  }
  return state;
}

// ─── Binding resolution ───────────────────────────────────────────────────────

/**
 * Safely resolve a binding expression against a state map.
 * Only allows simple variable references (no eval, no property chains > 2).
 * @param {string} expr     Binding expression, e.g. "username" or "user.name"
 * @param {Map} stateMap
 * @returns {string}
 */
export function resolveBinding(expr, stateMap) {
  if (!expr || typeof expr !== 'string') return '';
  const clean = expr.trim();

  if (isUnsafeExpr(clean)) return '';

  const parts = clean.split('.');
  if (parts.length === 1) {
    const entry = stateMap.get(clean);
    return entry !== undefined ? String(entry.value ?? '') : '';
  }
  if (parts.length === 2) {
    const entry = stateMap.get(parts[0]);
    if (entry && typeof entry.value === 'object' && entry.value !== null) {
      return String(entry.value[parts[1]] ?? '');
    }
  }
  return '';
}

/**
 * Check if a binding expression is considered unsafe.
 * @param {string} expr
 * @returns {boolean}
 */
export function isUnsafeExpr(expr) {
  if (!expr) return false;
  // Reject: parentheses (function calls), brackets (array access),
  // more than 2 dot-chain levels, prototype-chain keywords
  if (/[()[\]]/.test(expr))    return true;
  if (expr.split('.').length > 3) return true;
  if (/(__proto__|constructor|prototype)/i.test(expr)) return true;
  if (/[+\-*/&|!<>=;{}]/.test(expr)) return true;
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferType(value) {
  if (value === null || value === undefined) return 'any';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number')  return 'number';
  return 'string';
}
