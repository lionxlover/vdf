/**
 * Zolto Diagram Semantic Validator — Phase 5
 *
 * Performs static semantic validation checks on Diagram ASTs.
 */

import { DIAGRAM_LAYOUTS, DIAGRAM_TYPES } from './ast.js';
import { DiagramDiagnostics } from './diagnostics.js';
import { DiagramGraph } from './graph.js';

export function validateDiagram(diagramAst) {
  const diagnostics = new DiagramDiagnostics();

  if (!diagramAst || diagramAst.type !== 'diagram') {
    diagnostics.error('E501', 'Invalid AST root node for diagram validation');
    return diagnostics;
  }

  // Validate diagram type
  if (!DIAGRAM_TYPES.has(diagramAst.diagramType)) {
    diagnostics.warn('W501', `Unknown diagram type '${diagramAst.diagramType}'`);
  }

  // Validate layout engine
  if (diagramAst.layout && !DIAGRAM_LAYOUTS.has(diagramAst.layout.toLowerCase())) {
    diagnostics.warn('W502', `Unknown layout engine '${diagramAst.layout}', falling back to default`);
  }

  const graphNode = (diagramAst.children ?? []).find(c => c.type === 'graph');
  if (!graphNode) {
    diagnostics.error('E502', 'Diagram missing inner graph node structure');
    return diagnostics;
  }

  const nodes = graphNode.nodes ?? [];
  const edges = graphNode.edges ?? [];
  const refs = graphNode.references ?? [];

  // Check for duplicate Node IDs
  const seenIds = new Set();
  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      diagnostics.error('E503', `Duplicate node ID detected: '${node.id}'`, { nodeId: node.id });
    }
    seenIds.add(node.id);
  }

  const graph = new DiagramGraph(nodes, edges, refs);

  // Validate edge endpoints
  for (const edge of edges) {
    const fromReal = graph.resolveId(edge.from);
    const toReal = graph.resolveId(edge.to);

    if (!graph.getNode(fromReal)) {
      diagnostics.error('E504', `Edge connects from unknown node ID '${edge.from}'`, { nodeId: edge.from });
    }
    if (!graph.getNode(toReal)) {
      diagnostics.error('E505', `Edge connects to unknown node ID '${edge.to}'`, { nodeId: edge.to });
    }
  }

  // Validate circular references for strict tree diagrams
  if (['tree', 'decision', 'gantt', 'org'].includes(diagramAst.diagramType)) {
    if (graph.hasCycles()) {
      diagnostics.warn('W503', `Diagram type '${diagramAst.diagramType}' contains cyclic edge connections`);
    }
  }

  return diagnostics;
}
