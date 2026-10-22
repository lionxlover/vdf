/**
 * Zolto Math Validator — Phase 4
 *
 * Cross-equation checks that the per-equation parser can't see on its own:
 *   - Duplicate `label="…"` across @math blocks
 *   - `@ref(id)` pointing at a label that doesn't exist
 *   - Surfacing parser-level diagnostics (unknown commands, unclosed
 *     environments, mismatched braces) into the main Diagnostics system
 *
 * Called from src/validator.js — never invoked standalone by the public API.
 */

import { Code } from './diagnostics.js';

/**
 * @param {DocumentNode} doc
 * @param {Diagnostics} d   Shared diagnostics collector (mutated in place)
 */
export function validateMath(doc, d) {
  const labelSeen = new Map(); // label -> true
  const labels    = new Set();
  const refs      = [];        // { id, node }

  walk(doc.children ?? [], labelSeen, labels, refs, d);

  for (const { id } of refs) {
    if (!labels.has(id)) {
      d.warn(Code.UNDEFINED_EQ_REF, `Undefined equation reference: @ref(${id})`);
    }
  }
}

function walk(nodes, labelSeen, labels, refs, d) {
  for (const node of nodes ?? []) {
    if (!node) continue;

    if (node.type === 'math_block') {
      if (node.label) {
        if (labelSeen.has(node.label)) {
          d.warn(Code.DUPLICATE_EQ_LABEL, `Duplicate equation label: "${node.label}"`);
        } else {
          labelSeen.set(node.label, true);
          labels.add(node.label);
        }
      }
      // Surface parser-level diagnostics collected during parsing.
      for (const e of node.parseErrors ?? []) {
        d.error(Code.MATH_PARSE_ERROR, e.message, { line: node.line });
      }
    }

    if (node.type === 'math_ref') {
      refs.push({ id: node.refId, node });
    }

    // Recurse into block/inline children and inline arrays alike.
    walk(node.children, labelSeen, labels, refs, d);
    if (Array.isArray(node.items)) walk(node.items, labelSeen, labels, refs, d);
    if (Array.isArray(node.tabs))  walk(node.tabs,  labelSeen, labels, refs, d);
    if (Array.isArray(node.head))  for (const row of node.head) walk(row.cells, labelSeen, labels, refs, d);
    if (Array.isArray(node.rows) && node.rows[0]?.cells) {
      for (const row of node.rows) walk(row.cells, labelSeen, labels, refs, d);
    }
  }
}
