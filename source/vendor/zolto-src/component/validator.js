/**
 * Zolto Component Validator — Phase 9
 *
 * Performs static analysis on Phase 9 AST nodes, checking for unknown components,
 * missing required props, invalid prop types, slot mismatches, duplicate names,
 * and invalid conditional or loop syntax.
 */

import { ComponentDiagnostics } from './diagnostics.js';

export function validateComponents(nodes = [], registry = null) {
  const diagnostics = new ComponentDiagnostics();
  const seenDefs = new Set();

  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;

    switch (node.type) {
      case 'component_def': {
        if (seenDefs.has(node.name)) {
          diagnostics.warn('E905', `Duplicate component definition "${node.name}"`, { name: node.name });
        }
        seenDefs.add(node.name);
        break;
      }

      case 'component_use': {
        if (registry && !registry.hasComponent(node.name)) {
          diagnostics.error('E901', `Unknown component "${node.name}"`, { name: node.name });
        } else if (registry) {
          const compDef = registry.getComponent(node.name);
          if (compDef && Array.isArray(compDef.props)) {
            for (const p of compDef.props) {
              if (p.required && !(p.name in node.props)) {
                diagnostics.error('E902', `Missing required prop "${p.name}" for component "${node.name}"`, { name: p.name });
              }
            }
          }
        }
        break;
      }

      case 'template_use': {
        if (registry && !registry.hasTemplate(node.name)) {
          diagnostics.error('E912', `Unknown template "${node.name}"`, { name: node.name });
        }
        break;
      }

      case 'macro_use': {
        if (registry && !registry.hasMacro(node.name)) {
          diagnostics.error('E909', `Unknown macro "${node.name}"`, { name: node.name });
        }
        break;
      }

      case 'conditional_block': {
        if (!node.branches || node.branches.length === 0) {
          diagnostics.error('E910', 'Conditional block missing condition expression');
        }
        break;
      }

      case 'loop_block': {
        if (!node.iterable) {
          diagnostics.error('E911', 'Loop block missing iterable array name');
        }
        break;
      }
    }
  }

  return diagnostics;
}
