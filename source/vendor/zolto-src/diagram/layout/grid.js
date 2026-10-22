/**
 * Zolto Grid Layout Algorithm — Phase 5
 *
 * Grid placement algorithm for component, deployment, gantt, sankey, and matrix structures.
 */

export function layoutGrid(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return { width: 400, height: 300, nodePositions: new Map(), edgePaths: [] };
  }

  const nodeWidth = opts.nodeWidth ?? 130;
  const nodeHeight = opts.nodeHeight ?? 45;
  const cols = opts.cols ?? Math.ceil(Math.sqrt(nodes.length));
  const colSep = opts.colSep ?? 50;
  const rowSep = opts.rowSep ?? 50;
  const padding = 60;

  const nodePositions = new Map();

  nodes.forEach((node, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const effWidth = Math.max(nodeWidth, String(node.label || node.id).length * 8 + 32);

    const x = padding + col * (effWidth + colSep);
    const y = padding + row * (nodeHeight + rowSep);

    nodePositions.set(node.id, {
      x,
      y,
      width: effWidth,
      height: nodeHeight,
      row,
      col,
    });
  });

  let maxW = nodeWidth;
  for (const pos of nodePositions.values()) {
    maxW = Math.max(maxW, pos.width);
  }

  const totalRows = Math.ceil(nodes.length / cols);
  const width = padding * 2 + cols * maxW + Math.max(0, cols - 1) * colSep;
  const height = padding * 2 + totalRows * nodeHeight + Math.max(0, totalRows - 1) * rowSep;

  const edgePaths = edges.map(edge => {
    const src = nodePositions.get(edge.from);
    const tgt = nodePositions.get(edge.to);

    if (!src || !tgt) return { ...edge, path: '' };

    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height / 2;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y + tgt.height / 2;

    const path = `M ${x1} ${y1} L ${x2} ${y2}`;

    return {
      ...edge,
      x1, y1, x2, y2,
      path,
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2,
    };
  });

  return { width, height, nodePositions, edgePaths };
}
