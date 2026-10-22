/**
 * Zolto Component, Template & Macro Subsystem Entry Point — Phase 9
 *
 * Re-exports parser, renderer, validator, and registry facades.
 */

import { parseComponentSource } from './parser.js';
import { renderComponentNode } from './renderer.js';
import { validateComponents } from './validator.js';
import { ComponentRegistry, getGlobalRegistry } from './registry.js';
import { COMPONENT_NODE_TYPES, isComponentNode } from './ast.js';

export function parseComponent(sourceText, options = {}) {
  const nodes = parseComponentSource(sourceText, options);
  const registry = options.registry || getGlobalRegistry();

  for (const node of nodes) {
    if (node.type === COMPONENT_NODE_TYPES.COMPONENT_DEF) {
      registry.registerComponent(node.name, node);
    } else if (node.type === COMPONENT_NODE_TYPES.TEMPLATE_DEF) {
      registry.registerTemplate(node.name, node);
    } else if (node.type === COMPONENT_NODE_TYPES.MACRO_DEF) {
      registry.registerMacro(node.name, node);
    }
  }

  return { nodes, registry };
}

export function renderComponent(node, context = {}, registry = null, renderBlockFn = null) {
  const reg = registry || getGlobalRegistry();
  return renderComponentNode(node, context, reg, renderBlockFn);
}

export function validateComponent(nodes = [], registry = null) {
  const reg = registry || getGlobalRegistry();
  return validateComponents(nodes, reg);
}

export {
  ComponentRegistry,
  getGlobalRegistry,
  COMPONENT_NODE_TYPES,
  isComponentNode,
};
