/**
 * Zolto Math Renderer Orchestrator — Phase 4
 */

import { renderMathML } from './mathml.js';
import { renderSVG } from './svg.js';

export function render(node, target = 'html', isDisplay = false, label = null, number = null) {
  if (!node) return '';

  const mathml = renderMathML(node);
  const displayAttr = isDisplay ? ' display="block"' : '';
  const cleanMathML = `<math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr}>${mathml}</math>`;

  if (target === 'mathml') {
    return cleanMathML;
  }

  if (target === 'svg') {
    return renderSVG(node, isDisplay);
  }

  // HTML target (Accessible semantic wrap)
  const ariaLabel = getAriaLabel(node);
  const blockClass = isDisplay ? ' zl-math-block' : ' zl-math-inline';
  const labelId = label ? ` id="${escapeAttr(label)}"` : '';
  const tabIndex = isDisplay ? ' tabindex="0"' : '';

  let output = `<span class="zl-math-wrap${blockClass}" role="math" aria-label="${escapeAttr(ariaLabel)}"${labelId}${tabIndex}>${cleanMathML}</span>`;

  if (isDisplay && number !== null) {
    output = `<div class="zl-math-equation-container" style="display: flex; align-items: center; justify-content: space-between; margin: 1em 0;">` +
             `<div style="flex-grow: 1; text-align: center;">${output}</div>` +
             `<span class="zl-equation-number" style="font-weight: 500; color: var(--text-secondary); margin-left: 1em;">(${number})</span>` +
             `</div>`;
  }

  return output;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getAriaLabel(node) {
  // Simple heuristic text description of mathematical AST for screen readers
  if (!node) return '';
  switch (node.type) {
    case 'number': return node.value;
    case 'identifier': return node.name.startsWith('\\') ? node.name.slice(1) : node.name;
    case 'operator': return node.value;
    case 'unary': return `${node.op} ${getAriaLabel(node.argument)}`;
    case 'binary': return `${getAriaLabel(node.left)} ${node.op} ${getAriaLabel(node.right)}`;
    case 'fraction': return `fraction ${getAriaLabel(node.numerator)} over ${getAriaLabel(node.denominator)}`;
    case 'root': return `square root of ${getAriaLabel(node.expression)}`;
    case 'power': return `${getAriaLabel(node.base)} raised to the power of ${getAriaLabel(node.exponent)}`;
    case 'subscript': return `${getAriaLabel(node.base)} sub ${getAriaLabel(node.index)}`;
    case 'summation': return `summation ${node.under ? `from ${getAriaLabel(node.under)}` : ''} ${node.over ? `to ${getAriaLabel(node.over)}` : ''}`;
    case 'product': return `product ${node.under ? `from ${getAriaLabel(node.under)}` : ''} ${node.over ? `to ${getAriaLabel(node.over)}` : ''}`;
    case 'integral': return `integral ${node.under ? `from ${getAriaLabel(node.under)}` : ''} ${node.over ? `to ${getAriaLabel(node.over)}` : ''}`;
    case 'limit': return `limit as ${getAriaLabel(node.variable)}`;
    case 'matrix': return `${node.variant} matrix`;
    case 'piecewise': return 'piecewise function';
    case 'function_call': return `${node.name} of ${node.args.map(getAriaLabel).join(', ')}`;
    case 'vector': return `vector ${getAriaLabel(node.value)}`;
    case 'set': return `set of ${node.elements.map(getAriaLabel).join(', ')}`;
    case 'equation': return getAriaLabel(node.expression);
    case 'equation_group': return 'group of equations';
    default: return 'mathematical formula';
  }
}
