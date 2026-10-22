/**
 * Zolto Macro Engine — Phase 9
 *
 * Manages macro registration, parameterized expansion, text/inline macros,
 * block macros, and recursion limit protection.
 */

import { interpolateText } from './props.js';

export const MAX_MACRO_RECURSION_DEPTH = 20;

export function expandMacro(macroDef, args = [], bodyContent = [], depth = 0, diagnostics = null) {
  if (depth > MAX_MACRO_RECURSION_DEPTH) {
    if (diagnostics) {
      diagnostics.error('E906', `Max macro expansion depth (${MAX_MACRO_RECURSION_DEPTH}) exceeded for "${macroDef.name}"`, { name: macroDef.name });
    }
    return '';
  }

  // Bind parameters to args
  const ctx = {};
  const params = macroDef.params || [];
  params.forEach((param, idx) => {
    const paramName = typeof param === 'string' ? param : param.name;
    ctx[paramName] = args[idx] !== undefined ? args[idx] : (param.defaultValue ?? '');
  });

  if (bodyContent && bodyContent.length > 0) {
    ctx.slot = bodyContent;
  }

  // Expand body AST nodes or text lines
  const expandedLines = [];
  for (const item of macroDef.body || []) {
    if (typeof item === 'string') {
      expandedLines.push(interpolateText(item, ctx));
    } else if (item && typeof item === 'object') {
      if (item.type === 'paragraph' && Array.isArray(item.children)) {
        expandedLines.push(interpolateText(item.children.map(c => c.value || c.raw || '').join(''), ctx));
      } else {
        expandedLines.push(item);
      }
    }
  }

  return expandedLines.join('\n');
}
