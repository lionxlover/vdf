/**
 * Zolto Manual Layout Engine — Phase 5
 *
 * Uses explicit x, y, width, height attributes set on nodes.
 */

export function layoutManual(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return { width: 400, height: 300, nodePositions: new Map(), edgePaths: [] };
  }

  const defaultWidth = opts.nodeWidth ?? 120;
  const defaultHeight = opts.nodeHeight ?? 45;
  const padding = 50;

  const nodePositions = new Map();

  nodes.forEach((node, idx) => {
    const x = typeof node.attributes.x === 'number' ? node.attributes.x : (idx * 150 + padding);
    const y = typeof node.attributes.y === 'number' ? node.attributes.y : (padding);
    const w = typeof node.attributes.width === 'number' ? node.attributes.width : defaultWidth;
    const h = typeof node.attributes.height === 'number' ? node.attributes.height : defaultHeight;

    nodePositions.set(node.id, { x, y, width: w, height: h });
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pos of nodePositions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  const width = Math.max(400, (maxX - minX) + padding * 2);
  const height = Math.max(300, (maxY - minY) + padding * 2);

  const edgePaths = edges.map(edge => {
    const src = nodePositions.get(edge.from);
    const tgt = nodePositions.get(edge.to);

    if (!src || !tgt) return { ...edge, path: '' };

    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height / 2;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y + tgt.height / 2;

    return {
      ...edge,
      x1, y1, x2, y2,
      path: `M ${x1} ${y1} L ${x2} ${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
    };
  });

  return { width, height, nodePositions, edgePaths };
}
