/**
 * Zolto Vector Scene Graph Engine — Phase 7
 *
 * Manages the scene graph hierarchy, parent-child relationships,
 * symbol definition registration, and layer indexing.
 */

export class VectorSceneGraph {
  constructor(rootNode) {
    this.root = rootNode;
    this.nodeMap = new Map();
    this.symbolMap = new Map();
    this.styleMap = new Map();
    this.gradientMap = new Map();
    this.patternMap = new Map();

    this.indexGraph(this.root);
  }

  indexGraph(node) {
    if (!node || typeof node !== 'object') return;

    if (node.id) {
      this.nodeMap.set(node.id, node);
      if (node.type === 'vector_symbol') this.symbolMap.set(node.id, node);
      if (node.type === 'vector_style') this.styleMap.set(node.id, node);
      if (node.type === 'vector_gradient') this.gradientMap.set(node.id, node);
      if (node.type === 'vector_pattern') this.patternMap.set(node.id, node);
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        this.indexGraph(child);
      }
    }
  }

  getNode(id) {
    return this.nodeMap.get(id);
  }

  getSymbol(id) {
    return this.symbolMap.get(id);
  }

  getStyle(id) {
    return this.styleMap.get(id);
  }
}
