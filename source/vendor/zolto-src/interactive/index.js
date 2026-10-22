/**
 * Zolto Interactive Subsystem Entry Point — Phase 10
 *
 * Public API façade for the interactive document engine.
 */

import { parseInteractiveSource } from './parser.js';
import { renderInteractiveNode, hasInteractiveNodes } from './renderer.js';
import { validateInteractiveNodes } from './validator.js';
import { INTERACTIVE_NODE_TYPES, isInteractiveNode } from './ast.js';
import { INTERACTIVE_CSS } from './styles.js';

export { INTERACTIVE_CSS, INTERACTIVE_NODE_TYPES, isInteractiveNode, renderInteractiveNode, hasInteractiveNodes };


/**
 * Parse raw interactive block content to an array of AST nodes.
 * @param {string} src
 * @param {object} [options]
 * @returns {{ nodes: object[], diagnostics: import('./diagnostics.js').InteractiveDiagnostics }}
 */
export function parseInteractive(src, options = {}) {
  const nodes = parseInteractiveSource(src);
  const diagnostics = validateInteractiveNodes(nodes);
  return { nodes, diagnostics };
}

/**
 * Render an interactive AST node (or array of nodes) to HTML.
 * @param {object|object[]} node
 * @param {object} [opts]
 * @returns {string}
 */
export function renderInteractive(node, opts = {}) {
  if (Array.isArray(node)) {
    return node.map(n => renderInteractiveNode(n, opts)).filter(Boolean).join('\n');
  }
  return renderInteractiveNode(node, opts);
}

/**
 * Validate an array of interactive AST nodes.
 * @param {object[]} nodes
 * @returns {import('./diagnostics.js').InteractiveDiagnostics}
 */
export function validateInteractive(nodes) {
  return validateInteractiveNodes(nodes || []);
}


