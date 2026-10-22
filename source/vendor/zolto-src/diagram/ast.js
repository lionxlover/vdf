/**
 * Zolto Diagram AST Node Definitions — Phase 5
 *
 * Defines node creation functions and node type sets for the native diagram engine.
 */

export const DIAGRAM_TYPES = new Set([
  'flowchart', 'sequence', 'state', 'er', 'mindmap',
  'tree', 'decision', 'org', 'class', 'object',
  'package', 'component', 'deployment', 'usecase', 'activity',
  'network', 'dependency', 'filesystem', 'git', 'timeline',
  'gantt', 'sankey', 'journey',
]);

export const DIAGRAM_LAYOUTS = new Set([
  'hierarchical', 'tree', 'circular', 'radial',
  'force', 'grid', 'orthogonal', 'manual',
]);

export const DIAGRAM_SHAPES = new Set([
  'rect', 'circle', 'diamond', 'round-rect', 'hexagon', 'pill',
  'actor', 'cylinder', 'package', 'component', 'node', 'cloud',
]);

/**
 * Creates a Diagram AST root node.
 */
export function diagramNode(type = 'flowchart', children = [], opts = {}) {
  return {
    type: 'diagram',
    diagramType: type.toLowerCase(),
    id: opts.id ?? null,
    theme: opts.theme ?? 'light',
    layout: opts.layout ?? 'hierarchical',
    aria: opts.aria ?? null,
    title: opts.title ?? null,
    attributes: opts.attributes ?? {},
    children,
  };
}

/**
 * Graph node holding top-level graph structure.
 */
export function graphNode(children = [], opts = {}) {
  return {
    type: 'graph',
    nodes: opts.nodes ?? [],
    edges: opts.edges ?? [],
    groups: opts.groups ?? [],
    clusters: opts.clusters ?? [],
    references: opts.references ?? [],
    children,
  };
}

/**
 * Diagram Node element (a single node/vertex in a graph).
 */
export function diagramNodeItem(id, label = null, shape = 'rect', opts = {}) {
  return {
    type: 'node',
    id,
    label: label ?? id,
    shape: shape || 'rect',
    style: opts.style ?? null,
    fill: opts.fill ?? null,
    stroke: opts.stroke ?? null,
    color: opts.color ?? null,
    radius: opts.radius ?? null,
    shadow: opts.shadow ?? false,
    opacity: opts.opacity ?? 1,
    animate: opts.animate ?? null,
    attributes: opts.attributes ?? {},
    metadata: opts.metadata ?? {},
  };
}

/**
 * Diagram Edge element (connection between nodes/ports).
 */
export function diagramEdgeNode(from, to, label = null, opts = {}) {
  return {
    type: 'edge',
    from,
    to,
    label: label ?? null,
    style: opts.style ?? 'solid',
    color: opts.color ?? null,
    arrow: opts.arrow ?? 'filled',
    fromPort: opts.fromPort ?? 'auto',
    toPort: opts.toPort ?? 'auto',
    animate: opts.animate ?? null,
    value: opts.value ?? null,
    cardinality: opts.cardinality ?? null,
    attributes: opts.attributes ?? {},
  };
}

/**
 * Group element (logical grouping of node IDs).
 */
export function groupNode(id, label = null, nodeIds = [], opts = {}) {
  return {
    type: 'group',
    id,
    label: label ?? id,
    nodeIds: [...nodeIds],
    attributes: opts.attributes ?? {},
  };
}

/**
 * Cluster element (visual bounded container holding nodes/subgraphs).
 */
export function clusterNode(id, label = null, nodeIds = [], children = [], opts = {}) {
  return {
    type: 'cluster',
    id,
    label: label ?? id,
    nodeIds: [...nodeIds],
    children,
    attributes: opts.attributes ?? {},
  };
}

/**
 * Cross-reference alias (ref OriginalId as NewAlias).
 */
export function referenceNode(originalId, alias) {
  return {
    type: 'reference',
    originalId,
    alias,
  };
}

/**
 * Label Node.
 */
export function labelNode(text, opts = {}) {
  return {
    type: 'label',
    text,
    position: opts.position ?? 'center',
  };
}

/**
 * Shape Node specification.
 */
export function shapeNode(name, opts = {}) {
  return {
    type: 'shape',
    name: name.toLowerCase(),
    attributes: opts.attributes ?? {},
  };
}

/**
 * Port specification for connector docking.
 */
export function portNode(name, side = 'auto') {
  return {
    type: 'port',
    name,
    side: ['top', 'right', 'bottom', 'left', 'auto'].includes(side) ? side : 'auto',
  };
}

/**
 * Style Node specification.
 */
export function styleNode(properties = {}) {
  return {
    type: 'style',
    properties: { ...properties },
  };
}

/**
 * Layout configuration node.
 */
export function layoutNode(name, config = {}) {
  return {
    type: 'layout',
    name: name.toLowerCase(),
    config: { ...config },
  };
}

/**
 * Animation Placeholder node for Phase 5 structure.
 */
export function animationPlaceholderNode(targetId, type = 'fade', duration = 300) {
  return {
    type: 'animation_placeholder',
    targetId,
    animationType: type,
    duration,
  };
}
