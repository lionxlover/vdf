/**
 * Zolto Component, Template & Macro AST Definitions — Phase 9
 *
 * Defines monomorphic AST node factory functions for components, templates,
 * macros, props, slots, slot outlets, conditionals, and loops.
 */

export const COMPONENT_NODE_TYPES = Object.freeze({
  COMPONENT_DEF:     'component_def',
  COMPONENT_USE:     'component_use',
  TEMPLATE_DEF:      'template_def',
  TEMPLATE_USE:      'template_use',
  SLOT_DEF:          'slot_def',
  SLOT_OUTLET:       'slot_outlet',
  MACRO_DEF:         'macro_def',
  MACRO_USE:         'macro_use',
  CONDITIONAL_BLOCK: 'conditional_block',
  LOOP_BLOCK:        'loop_block',
  PROP_LIST:         'prop_list',
});

export function createComponentDefNode(name, props = [], slots = [], body = [], meta = {}) {
  return {
    type: COMPONENT_NODE_TYPES.COMPONENT_DEF,
    name: String(name || ''),
    props: props || [],
    slots: slots || [],
    body: body || [],
    author: meta.author || null,
    version: meta.version || null,
    description: meta.description || null,
  };
}

export function createComponentUseNode(name, props = {}, slots = {}, children = []) {
  return {
    type: COMPONENT_NODE_TYPES.COMPONENT_USE,
    name: String(name || ''),
    props: props || {},
    slots: slots || {},
    children: children || [],
  };
}

export function createTemplateDefNode(name, extendsName = null, props = [], slots = [], body = []) {
  return {
    type: COMPONENT_NODE_TYPES.TEMPLATE_DEF,
    name: String(name || ''),
    extendsName: extendsName ? String(extendsName) : null,
    props: props || [],
    slots: slots || [],
    body: body || [],
  };
}

export function createTemplateUseNode(name, props = {}, slots = {}, children = []) {
  return {
    type: COMPONENT_NODE_TYPES.TEMPLATE_USE,
    name: String(name || ''),
    props: props || {},
    slots: slots || {},
    children: children || [],
  };
}

export function createSlotDefNode(name = 'default', fallback = []) {
  return {
    type: COMPONENT_NODE_TYPES.SLOT_DEF,
    name: String(name || 'default'),
    fallback: fallback || [],
  };
}

export function createSlotOutletNode(name = 'default', body = []) {
  return {
    type: COMPONENT_NODE_TYPES.SLOT_OUTLET,
    name: String(name || 'default'),
    body: body || [],
  };
}

export function createMacroDefNode(name, params = [], isBlock = false, body = []) {
  return {
    type: COMPONENT_NODE_TYPES.MACRO_DEF,
    name: String(name || ''),
    params: params || [],
    isBlock: Boolean(isBlock),
    body: body || [],
  };
}

export function createMacroUseNode(name, args = [], body = []) {
  return {
    type: COMPONENT_NODE_TYPES.MACRO_USE,
    name: String(name || ''),
    args: args || [],
    body: body || [],
  };
}

export function createConditionalBlockNode(branches = [], elseBranch = null) {
  return {
    type: COMPONENT_NODE_TYPES.CONDITIONAL_BLOCK,
    branches: branches || [], // Array of { condition: string|expr, body: [] }
    elseBranch: elseBranch || null,
  };
}

export function createLoopBlockNode(iterable, itemVar, indexVar = null, keyExpr = null, body = []) {
  return {
    type: COMPONENT_NODE_TYPES.LOOP_BLOCK,
    iterable: String(iterable || ''),
    itemVar: String(itemVar || 'item'),
    indexVar: indexVar ? String(indexVar) : null,
    keyExpr: keyExpr ? String(keyExpr) : null,
    body: body || [],
  };
}

export function createPropListNode(props = []) {
  return {
    type: COMPONENT_NODE_TYPES.PROP_LIST,
    props: props || [],
  };
}

export function isComponentNode(node) {
  return Boolean(
    node &&
    typeof node === 'object' &&
    Object.values(COMPONENT_NODE_TYPES).includes(node.type)
  );
}
