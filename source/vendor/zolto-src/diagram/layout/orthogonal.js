/**
 * Zolto Orthogonal Layout & Connector Router — Phase 5
 *
 * Manhattan right-angle edge router for clean architectural diagram connectors.
 */

import { layoutHierarchical } from './hierarchical.js';

export function layoutOrthogonal(graph, opts = {}) {
  // Compute node coordinates using hierarchical or grid placement
  const baseLayout = layoutHierarchical(graph, opts);

  const edgePaths = baseLayout.edgePaths.map(edge => {
    const src = baseLayout.nodePositions.get(edge.from);
    const tgt = baseLayout.nodePositions.get(edge.to);

    if (!src || !tgt) return edge;

    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y;

    const midY = (y1 + y2) / 2;
    const path = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;

    return {
      ...edge,
      x1, y1, x2, y2,
      path,
      labelX: (x1 + x2) / 2,
      labelY: midY,
    };
  });

  return {
    ...baseLayout,
    edgePaths,
  };
}
