/**
 * Zolto Circular Layout Algorithm — Phase 5
 *
 * Places graph nodes evenly along a circle or ellipse perimeter.
 */

export function layoutCircular(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return { width: 400, height: 300, nodePositions: new Map(), edgePaths: [] };
  }

  const nodeWidth = opts.nodeWidth ?? 120;
  const nodeHeight = opts.nodeHeight ?? 45;
  const count = nodes.length;

  const radius = Math.max(160, count * 35);
  const cx = radius + 80;
  const cy = radius + 80;

  const nodePositions = new Map();

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const x = cx + radius * Math.cos(angle) - nodeWidth / 2;
    const y = cy + radius * Math.sin(angle) - nodeHeight / 2;

    nodePositions.set(node.id, {
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      angle,
    });
  });

  const width = cx * 2;
  const height = cy * 2;

  const edgePaths = edges.map(edge => {
    const src = nodePositions.get(edge.from);
    const tgt = nodePositions.get(edge.to);

    if (!src || !tgt) return { ...edge, path: '' };

    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height / 2;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y + tgt.height / 2;

    const path = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

    return {
      ...edge,
      x1, y1, x2, y2,
      path,
      labelX: (x1 + x2 + cx) / 3,
      labelY: (y1 + y2 + cy) / 3,
    };
  });

  return { width, height, nodePositions, edgePaths };
}
