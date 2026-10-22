/**
 * Zolto Hierarchical Layout Algorithm — Phase 5
 *
 * Layered Sugiyama topological layout for flowcharts, state machines,
 * sequence diagrams, activity diagrams, dependency graphs.
 */

export function layoutHierarchical(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    return { width: 400, height: 300, nodePositions: new Map(), edgePaths: [] };
  }

  const nodeWidth = opts.nodeWidth ?? 140;
  const nodeHeight = opts.nodeHeight ?? 50;
  const rankSep = opts.rankSep ?? 80;
  const nodeSep = opts.nodeSep ?? 40;
  const isHorizontal = opts.direction === 'LR';

  // Compute layers via topological sort & longest path
  const inDegree = graph.getInDegreeMap();
  const adj = graph.getAdjacencyList();
  const layerMap = new Map();

  for (const node of nodes) {
    layerMap.set(node.id, 0);
  }

  const topoOrder = graph.topologicalSort();
  for (const u of topoOrder) {
    const currentLayer = layerMap.get(u);
    const neighbors = adj.get(u) ?? [];
    for (const v of neighbors) {
      if (layerMap.has(v)) {
        layerMap.set(v, Math.max(layerMap.get(v), currentLayer + 1));
      }
    }
  }

  // Group nodes by layer index
  const layers = new Map();
  let maxLayerIdx = 0;
  for (const node of nodes) {
    const lIdx = layerMap.get(node.id) ?? 0;
    maxLayerIdx = Math.max(maxLayerIdx, lIdx);
    if (!layers.has(lIdx)) layers.set(lIdx, []);
    layers.get(lIdx).push(node);
  }

  const nodePositions = new Map();
  let maxCrossDim = 0;

  for (let l = 0; l <= maxLayerIdx; l++) {
    const layerNodes = layers.get(l) ?? [];
    const layerSize = layerNodes.length;
    const crossTotal = layerSize * (isHorizontal ? nodeHeight : nodeWidth) + Math.max(0, layerSize - 1) * nodeSep;
    maxCrossDim = Math.max(maxCrossDim, crossTotal);

    const mainPos = l * ((isHorizontal ? nodeWidth : nodeHeight) + rankSep) + 40;

    layerNodes.forEach((node, idx) => {
      const effWidth = Math.max(nodeWidth, String(node.label || node.id).length * 8 + 32);
      const crossPos = (idx - (layerSize - 1) / 2) * ((isHorizontal ? nodeHeight : effWidth) + nodeSep) + 200;
      const x = isHorizontal ? mainPos : crossPos - effWidth / 2;
      const y = isHorizontal ? crossPos - nodeHeight / 2 : mainPos;

      nodePositions.set(node.id, {
        x,
        y,
        width: effWidth,
        height: nodeHeight,
        layer: l,
      });
    });
  }

  // Calculate overall layout bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pos of nodePositions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  const padding = 60;
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

  // Compute edge connection paths
  const edgePaths = edges.map(edge => {
    const src = nodePositions.get(edge.from);
    const tgt = nodePositions.get(edge.to);

    if (!src || !tgt) {
      return { ...edge, path: '' };
    }

    if (edge.from === edge.to) {
      const loopPath = `M ${src.x + src.width} ${src.y + src.height / 2} C ${src.x + src.width + 45} ${src.y - 15}, ${src.x + src.width + 45} ${src.y + src.height + 15}, ${src.x + src.width / 2} ${src.y + src.height}`;
      return {
        ...edge,
        x1: src.x + src.width,
        y1: src.y + src.height / 2,
        x2: src.x + src.width / 2,
        y2: src.y + src.height,
        path: loopPath,
        labelX: src.x + src.width + 40,
        labelY: src.y + src.height / 2,
      };
    }

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
