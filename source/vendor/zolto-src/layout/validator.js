/**
 * Zolto Layout Engine — Static Validator (Phase 8)
 *
 * Validates layout AST structures for invalid nesting, grid overflow, duplicate IDs,
 * and broken spatial configurations.
 */

import { LayoutDiagnostics } from './diagnostics.js';
import { LAYOUT_NODE_TYPES } from './ast.js';

export function validateLayout(ast) {
  const diag = new LayoutDiagnostics();
  if (!ast) return diag;

  const seenIds = new Set();

  function walk(node, parentStack = []) {
    if (!node || typeof node !== 'object') return;

    const parentType = parentStack[parentStack.length - 1]?.type;

    // Check invalid parent-child relationships
    switch (node.type) {
      case LAYOUT_NODE_TYPES.CELL:
        if (parentType !== LAYOUT_NODE_TYPES.GRID) {
          diag.error('E801', `@cell directive must be directly inside @grid (found inside ${parentType ?? 'root'})`);
        }
        break;

      case LAYOUT_NODE_TYPES.FLEX_ITEM:
        if (parentType !== LAYOUT_NODE_TYPES.FLEX && parentType !== LAYOUT_NODE_TYPES.STACK) {
          diag.warning('W801', `@item directive should be inside @flex or @stack (found inside ${parentType ?? 'root'})`);
        }
        break;

      case LAYOUT_NODE_TYPES.SLIDE:
        if (parentType !== LAYOUT_NODE_TYPES.PRESENTATION) {
          diag.error('E802', `@slide directive must be directly inside @presentation (found inside ${parentType ?? 'root'})`);
        }
        break;

      case LAYOUT_NODE_TYPES.PAGE:
        if (parentType !== LAYOUT_NODE_TYPES.PAGES && parentType !== LAYOUT_NODE_TYPES.LAYOUT) {
          diag.warning('W802', `@page directive is usually inside @pages or @layout (found inside ${parentType ?? 'root'})`);
        }
        break;

      case LAYOUT_NODE_TYPES.CANVAS_LAYER:
        if (parentType !== LAYOUT_NODE_TYPES.CANVAS) {
          diag.error('E803', `@layer directive must be directly inside @canvas (found inside ${parentType ?? 'root'})`);
        }
        break;
    }

    // Cell span validation
    if (node.type === LAYOUT_NODE_TYPES.CELL) {
      const span = node.span ?? 1;
      const rowSpan = node.rowSpan ?? 1;
      if (typeof span === 'number' && span <= 0) {
        diag.warning('W805', `@cell span=${span} must be greater than 0`);
      }
      if (typeof rowSpan === 'number' && rowSpan <= 0) {
        diag.warning('W805', `@cell row-span=${rowSpan} must be greater than 0`);
      }
    }

    // Grid column overflow check
    if (node.type === LAYOUT_NODE_TYPES.GRID && typeof node.columns === 'number') {
      let totalSpan = 0;
      for (const child of node.children ?? []) {
        if (child.type === LAYOUT_NODE_TYPES.CELL) {
          const span = child.span ?? 1;
          if (span > node.columns) {
            diag.warning('W803', `@cell span=${span} exceeds grid columns=${node.columns}`);
          }
          totalSpan += span;
        }
      }
    }

    // Duplicate ID check for sections and canvas layers
    if (node.id) {
      if (seenIds.has(node.id)) {
        diag.warning('W804', `Duplicate ID '${node.id}' in layout element`);
      } else {
        seenIds.add(node.id);
      }
    }

    // Recurse into children
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child, [...parentStack, node]);
      }
    }
  }

  walk(ast);
  return diag;
}
