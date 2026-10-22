/**
 * Zolto Sequence Diagram Layout Engine — Phase 5/6
 *
 * Dedicated layout strategy algorithm for Sequence Diagrams:
 * - Positions participants/actors horizontally along top axis
 * - Generates vertical lifelines
 * - Maps message edges to ordered horizontal step heights
 */

export function layoutSequence(graph, opts = {}) {
  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  const nodePositions = new Map();
  const edgePaths = [];

  const padLeft = 100;
  const padRight = 100;
  const padTop = 40;
  const colWidth = Math.max(180, Math.floor(550 / Math.max(1, nodes.length)));
  const stepY = 55;
  const headerH = 65;

  const totalHeight = padTop + headerH + Math.max(1, edges.length) * stepY + 60;
  const totalWidth = Math.max(650, padLeft + padRight + Math.max(0, nodes.length - 1) * colWidth);

  // 1. Position participant nodes horizontally
  nodes.forEach((node, i) => {
    const cx = padLeft + i * colWidth;
    const width = 100;
    const height = node.shape === 'actor' ? 55 : 40;
    const x = cx - width / 2;
    const y = padTop;

    nodePositions.set(node.id, {
      x,
      y,
      width,
      height,
      cx,
      lifelineY1: y + height,
      lifelineY2: totalHeight - 30,
    });
  });

  // 2. Position step messages horizontally between participant lifelines
  edges.forEach((edge, k) => {
    const fromNode = nodePositions.get(edge.from);
    const toNode = nodePositions.get(edge.to);

    const stepYPos = padTop + headerH + (k + 1) * stepY;

    const x1 = fromNode ? fromNode.cx : padLeft;
    const x2 = toNode ? toNode.cx : padLeft + colWidth;

    let path = '';
    let labelX = (x1 + x2) / 2;
    let labelY = stepYPos - 8;

    if (x1 === x2) {
      // Self-loop message path
      const loopWidth = 40;
      const loopHeight = 25;
      path = `M ${x1} ${stepYPos} H ${x1 + loopWidth} V ${stepYPos + loopHeight} H ${x1}`;
      labelX = x1 + loopWidth + 10;
      labelY = stepYPos + loopHeight / 2;
    } else {
      path = `M ${x1} ${stepYPos} L ${x2} ${stepYPos}`;
    }

    edgePaths.push({
      edge,
      path,
      label: edge.label,
      labelX,
      labelY,
      labelPos: {
        x: labelX,
        y: labelY,
      },
      fromPos: { x: x1, y: stepYPos, width: 0, height: 0 },
      toPos: { x: x2, y: stepYPos, width: 0, height: 0 },
      arrow: edge.arrow || 'filled',
      style: edge.style || 'solid',
    });
  });

  return {
    nodePositions,
    edgePaths,
    width: totalWidth,
    height: totalHeight,
    isSequence: true,
  };
}
