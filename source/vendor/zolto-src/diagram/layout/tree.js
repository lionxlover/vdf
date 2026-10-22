/**
 * Zolto Tree Layout Algorithm — Phase 5
 *
 * Tree and hierarchy layout for trees, org charts, decision trees, and mind maps.
 */

export function layoutTree(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return { width: 400, height: 300, nodePositions: new Map(), edgePaths: [] };
  }

  const nodeWidth = opts.nodeWidth ?? 130;
  const nodeHeight = opts.nodeHeight ?? 45;
  const levelSep = opts.levelSep ?? 90;
  const siblingSep = opts.siblingSep ?? 30;

  const roots = graph.getRoots();
  const root = roots[0] ?? nodes[0];

  const adj = graph.getAdjacencyList();
  const nodePositions = new Map();

  let leafIndex = 0;

  function traverseTree(nodeId, depth = 0) {
    const children = adj.get(nodeId) ?? [];
    const n = graph.getNode(nodeId);
    const effWidth = n ? Math.max(nodeWidth, String(n.label || n.id).length * 8 + 32) : nodeWidth;

    if (children.length === 0) {
      const x = leafIndex * (effWidth + siblingSep);
      leafIndex++;
      const y = depth * (nodeHeight + levelSep);
      nodePositions.set(nodeId, { x, y, width: effWidth, height: nodeHeight, depth });
      return x;
    }

    const childXs = [];
    for (const childId of children) {
      if (!nodePositions.has(childId)) {
        childXs.push(traverseTree(childId, depth + 1));
      }
    }

    const firstX = childXs[0] ?? 0;
    const lastX = childXs[childXs.length - 1] ?? firstX;
    const midX = (firstX + lastX) / 2;
    const y = depth * (nodeHeight + levelSep);

    nodePositions.set(nodeId, { x: midX, y, width: effWidth, height: nodeHeight, depth });
    return midX;
  }

  traverseTree(root.id, 0);

  // Position any unvisited nodes
  for (const node of nodes) {
    if (!nodePositions.has(node.id)) {
      const effWidth = Math.max(nodeWidth, String(node.label || node.id).length * 8 + 32);
      const x = leafIndex * (effWidth + siblingSep);
      leafIndex++;
      nodePositions.set(node.id, { x, y: 0, width: effWidth, height: nodeHeight, depth: 0 });
    }
  }

  // Adjust bounds with padding
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pos of nodePositions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  const padding = 50;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  for (const [id, pos] of nodePositions.entries()) {
    nodePositions.set(id, {
      ...pos,
      x: pos.x + offsetX,
      y: pos.y + offsetY,
    });
  }

  const width = Math.max(400, (maxX - minX) + padding * 2);
  const height = Math.max(300, (maxY - minY) + padding * 2);

  const edgePaths = edges.map(edge => {
    const src = nodePositions.get(edge.from);
    const tgt = nodePositions.get(edge.to);

    if (!src || !tgt) return { ...edge, path: '' };

    const x1 = src.x + src.width / 2;
    const y1 = src.y + src.height;
    const x2 = tgt.x + tgt.width / 2;
    const y2 = tgt.y;

    const midY = (y1 + y2) / 2;
    const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

    return {
      ...edge,
      x1, y1, x2, y2,
      path,
      labelX: (x1 + x2) / 2,
      labelY: midY,
    };
  });

  return { width, height, nodePositions, edgePaths };
}
