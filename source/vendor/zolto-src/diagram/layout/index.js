/**
 * Zolto Pluggable Layout Manager — Phase 5
 *
 * Dispatches graph layout calculations to pluggable layout strategy algorithms.
 */

import { layoutHierarchical } from './hierarchical.js';
import { layoutTree } from './tree.js';
import { layoutCircular } from './circular.js';
import { layoutRadial } from './radial.js';
import { layoutForce } from './force.js';
import { layoutGrid } from './grid.js';
import { layoutOrthogonal } from './orthogonal.js';
import { layoutManual } from './manual.js';
import { layoutSequence } from './sequence.js';

export const LAYOUT_ALGORITHMS = new Map([
  ['hierarchical', layoutHierarchical],
  ['tree', layoutTree],
  ['circular', layoutCircular],
  ['radial', layoutRadial],
  ['force', layoutForce],
  ['grid', layoutGrid],
  ['orthogonal', layoutOrthogonal],
  ['manual', layoutManual],
  ['sequence', layoutSequence],
]);

/**
 * Computes layout for a diagram graph based on requested layout mode or diagram type defaults.
 */
export function computeGraphLayout(graph, layoutName = 'hierarchical', diagramType = 'flowchart', opts = {}) {
  let mode = (layoutName || 'hierarchical').toLowerCase();

  // Infer default layout from diagram type if layout is default/unspecified
  if (diagramType === 'sequence' || mode === 'sequence') {
    mode = 'sequence';
  } else if (!layoutName || layoutName === 'hierarchical') {
    if (['tree', 'org', 'decision'].includes(diagramType)) mode = 'tree';
    else if (['mindmap'].includes(diagramType)) mode = 'radial';
    else if (['network'].includes(diagramType)) mode = 'force';
    else if (['component', 'deployment', 'gantt', 'sankey'].includes(diagramType)) mode = 'grid';
  }

  const algorithm = LAYOUT_ALGORITHMS.get(mode) ?? layoutHierarchical;
  return algorithm(graph, { ...opts, diagramType });
}
