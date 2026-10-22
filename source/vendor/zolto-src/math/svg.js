/**
 * Zolto SVG Math Renderer — Phase 4
 * 
 * Renders mathematical expressions to vector graphics using native MathML
 * wrapped inside SVG foreignObject for maximum fidelity and styling compatibility.
 */

import { renderMathML } from './mathml.js';

export function renderSVG(node, isDisplay = false) {
  if (!node) return '';

  const mathml = renderMathML(node);
  const displayAttr = isDisplay ? ' display="block"' : '';
  
  // Wrap MathML inside foreignObject so that it gets rendered natively in SVG format.
  // Set default dimensions and styles.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="zl-math-svg" style="vertical-align: middle; overflow: visible; display: inline-block;" width="100%" height="1.2em">`,
    `  <foreignObject x="0" y="0" width="100%" height="100%" style="overflow: visible;">`,
    `    <math xmlns="http://www.w3.org/1998/Math/MathML"${displayAttr} style="font-family: var(--font-sans); font-size: inherit;">`,
    `      ${mathml}`,
    `    </math>`,
    `  </foreignObject>`,
    `</svg>`
  ].join('\n');
}
