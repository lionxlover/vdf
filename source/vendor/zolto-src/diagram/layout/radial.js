/**
 * Zolto Radial Layout Algorithm — Phase 5
 *
 * Places root node at center with concentric rings for children (mindmaps/radials).
 */

export function layoutRadial(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return { width: 400, height: 300, nodePositions: new Map(), edgePaths: [] };
  }

  const nodeWidth = opts.nodeWidth ?? 120;
  const nodeHeight = opts.nodeHeight ?? 45;

  const roots = graph.getRoots();
  const root = roots[0] ?? nodes[0];
  const adj = graph.getAdjacencyList();

  const nodePositions = new Map();
  const levelRing = new Map();

  // BFS depth assignment
  const queue = [{ id: root.id, depth: 0 }];
  const visited = new Set([root.id]);

  while (queue.length > 0) {
    const item = queue.shift();
    const d = item.depth;
    if (!levelRing.has(d)) levelRing.set(d, []);
    levelRing.get(d).push(item.id);

    const children = adj.get(item.id) ?? [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, depth: d + 1 });
      }
    }
  }

  // Include unvisited nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (!levelRing.has(1)) levelRing.set(1, []);
      levelRing.get(1).push(node.id);
    }
  }

  const ringRadiusStep = 140;
  const maxDepth = Math.max(...levelRing.keys());
  const maxRadius = (maxDepth + 1) * ringRadiusStep;

  const cx = maxRadius + 80;
  const cy = maxRadius + 80;

  // Root at center
  nodePositions.set(root.id, {
    x: cx - nodeWidth / 2,
    y: cy - nodeHeight / 2,
    width: nodeWidth,
    height: nodeHeight,
  });

  for (const [depth, levelNodes] of levelRing.entries()) {
    if (depth === 0) continue;
    const r = depth * ringRadiusStep;
    const count = levelNodes.length;

    levelNodes.forEach((nodeId, idx) => {
      const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
      const x = cx + r * Math.cos(angle) - nodeWidth / 2;
      const y = cy + r * Math.sin(angle) - nodeHeight / 2;

      nodePositions.set(nodeId, {
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
      });
    });
  }

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
