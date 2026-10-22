/**
 * Zolto Vector Graphics Validator — Phase 7
 *
 * Performs static semantic validation on Vector AST trees.
 */

import { VectorDiagnostics, VectorDiagnosticCode } from './diagnostics.js';

export function validateVector(vectorAst) {
  const diagnostics = new VectorDiagnostics();
  if (!vectorAst || vectorAst.type !== 'vector') {
    diagnostics.error(VectorDiagnosticCode.E_INVALID_GEOMETRY, 'Root node must be a valid vector AST');
    return diagnostics;
  }

  const seenIds = new Set();
  const definedIds = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.id) {
      if (seenIds.has(node.id)) {
        diagnostics.error(VectorDiagnosticCode.E_DUPLICATE_ID, `Duplicate vector node ID: "${node.id}"`);
      } else {
        seenIds.add(node.id);
        definedIds.add(node.id);
      }
    }

    if (node.type === 'vector_shape') {
      if (node.w < 0 || node.h < 0 || node.r < 0 || node.rx < 0 || node.ry < 0) {
        diagnostics.error(VectorDiagnosticCode.E_INVALID_GEOMETRY, `Invalid shape dimensions for shape "${node.shape}"`);
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(vectorAst);
  return diagnostics;
}
