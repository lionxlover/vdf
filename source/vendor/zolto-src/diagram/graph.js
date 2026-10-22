/**
 * Zolto Graph Topology & Query Engine — Phase 5
 *
 * Provides structural query algorithms (degrees, roots, topological sort,
 * connected components, cycle detection) used by layout engines and validators.
 */

export class DiagramGraph {
  constructor(nodes = [], edges = [], refs = []) {
    this.nodes = new Map();
    this.edges = [...edges];
    this.aliasMap = new Map();

    for (const ref of refs) {
      if (ref.originalId && ref.alias) {
        this.aliasMap.set(ref.alias, ref.originalId);
      }
    }

    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
  }

  resolveId(id) {
    return this.aliasMap.get(id) ?? id;
  }

  getNode(id) {
    const realId = this.resolveId(id);
    return this.nodes.get(realId) ?? null;
  }

  getNodes() {
    return [...this.nodes.values()];
  }

  getEdges() {
    return this.edges.map(e => ({
      ...e,
      from: this.resolveId(e.from),
      to: this.resolveId(e.to),
    }));
  }

  getInDegreeMap() {
    const inDegree = new Map();
    for (const node of this.nodes.values()) {
      inDegree.set(node.id, 0);
    }
    for (const edge of this.getEdges()) {
      const toId = edge.to;
      if (inDegree.has(toId)) {
        inDegree.set(toId, inDegree.get(toId) + 1);
      }
    }
    return inDegree;
  }

  getOutDegreeMap() {
    const outDegree = new Map();
    for (const node of this.nodes.values()) {
      outDegree.set(node.id, 0);
    }
    for (const edge of this.getEdges()) {
      const fromId = edge.from;
      if (outDegree.has(fromId)) {
        outDegree.set(fromId, outDegree.get(fromId) + 1);
      }
    }
    return outDegree;
  }

  getRoots() {
    const inDegree = this.getInDegreeMap();
    const roots = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) roots.push(this.nodes.get(id));
    }
    return roots.length > 0 ? roots : [...this.nodes.values()].slice(0, 1);
  }

  getAdjacencyList() {
    const adj = new Map();
    for (const node of this.nodes.values()) {
      adj.set(node.id, []);
    }
    for (const edge of this.getEdges()) {
      if (adj.has(edge.from)) {
        adj.get(edge.from).push(edge.to);
      }
    }
    return adj;
  }

  topologicalSort() {
    const inDegree = this.getInDegreeMap();
    const adj = this.getAdjacencyList();
    const queue = [];

    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const sorted = [];
    while (queue.length > 0) {
      const u = queue.shift();
      sorted.push(u);

      const neighbors = adj.get(u) ?? [];
      for (const v of neighbors) {
        inDegree.set(v, inDegree.get(v) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    // Append remaining nodes if graph has cycles
    if (sorted.length < this.nodes.size) {
      for (const id of this.nodes.keys()) {
        if (!sorted.includes(id)) sorted.push(id);
      }
    }

    return sorted;
  }

  hasCycles() {
    const visited = new Set();
    const recStack = new Set();
    const adj = this.getAdjacencyList();

    const dfs = u => {
      visited.add(u);
      recStack.add(u);

      const neighbors = adj.get(u) ?? [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          if (dfs(v)) return true;
        } else if (recStack.has(v)) {
          return true;
        }
      }

      recStack.delete(u);
      return false;
    };

    for (const id of this.nodes.keys()) {
      if (!visited.has(id)) {
        if (dfs(id)) return true;
      }
    }

    return false;
  }
}
