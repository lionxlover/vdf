/**
 * Zolto MathML Renderer — Phase 4
 */

export function renderMathML(node) {
  if (!node) return '';

  switch (node.type) {
    case 'number':
      return `<mn>${node.value}</mn>`;

    case 'identifier':
      return `<mi>${escapeMathML(node.name)}</mi>`;

    case 'operator':
      return `<mo>${escapeMathML(node.value)}</mo>`;

    case 'unary':
      return `<mrow><mo>${escapeMathML(node.op)}</mo>${renderMathML(node.argument)}</mrow>`;

    case 'binary':
      return `<mrow>${renderMathML(node.left)}<mo>${escapeMathML(node.op)}</mo>${renderMathML(node.right)}</mrow>`;

    case 'fraction':
      return `<mfrac>${renderMathML(node.numerator)}${renderMathML(node.denominator)}</mfrac>`;

    case 'root':
      if (node.radix) {
        return `<mroot>${renderMathML(node.expression)}${renderMathML(node.radix)}</mroot>`;
      }
      return `<msqrt>${renderMathML(node.expression)}</msqrt>`;

    case 'power':
      if (node.base.type === 'subscript') {
        return `<msubsup>${renderMathML(node.base.base)}${renderMathML(node.base.index)}${renderMathML(node.exponent)}</msubsup>`;
      }
      return `<msup>${renderMathML(node.base)}${renderMathML(node.exponent)}</msup>`;

    case 'subscript':
      if (node.base.type === 'power') {
        return `<msubsup>${renderMathML(node.base.base)}${renderMathML(node.index)}${renderMathML(node.base.exponent)}</msubsup>`;
      }
      return `<msub>${renderMathML(node.base)}${renderMathML(node.index)}</msub>`;

    case 'summation': {
      const sym = '<mo>&sum;</mo>';
      if (node.under && node.over) return `<munderover>${sym}${renderMathML(node.under)}${renderMathML(node.over)}</munderover>`;
      if (node.under) return `<munder>${sym}${renderMathML(node.under)}</munder>`;
      if (node.over) return `<mover>${sym}${renderMathML(node.over)}</mover>`;
      return sym;
    }

    case 'product': {
      const sym = '<mo>&prod;</mo>';
      if (node.under && node.over) return `<munderover>${sym}${renderMathML(node.under)}${renderMathML(node.over)}</munderover>`;
      if (node.under) return `<munder>${sym}${renderMathML(node.under)}</munder>`;
      if (node.over) return `<mover>${sym}${renderMathML(node.over)}</mover>`;
      return sym;
    }

    case 'integral': {
      const sym = '<mo>&int;</mo>';
      if (node.under && node.over) return `<msubsup>${sym}${renderMathML(node.under)}${renderMathML(node.over)}</msubsup>`;
      if (node.under) return `<msub>${sym}${renderMathML(node.under)}</msub>`;
      if (node.over) return `<msup>${sym}${renderMathML(node.over)}</msup>`;
      return sym;
    }

    case 'limit': {
      const limSym = '<mo>lim</mo>';
      const range = `<mrow>${renderMathML(node.variable)}</mrow>`;
      const main = node.expression ? renderMathML(node.expression) : '';
      return `<mrow><munder>${limSym}${range}</munder>${main}</mrow>`;
    }

    case 'matrix': {
      const table = renderMatrixTable(node.rows);
      const delimiters = getMatrixDelimiters(node.variant);
      if (delimiters) {
        return `<mrow><mo>${delimiters.open}</mo>${table}<mo>${delimiters.close}</mo></mrow>`;
      }
      return table;
    }

    case 'piecewise': {
      const rows = node.cases.map(c => [c.expression, c.condition]);
      const table = renderMatrixTable(rows);
      return `<mrow><mo>{</mo>${table}</mrow>`;
    }

    case 'function_call': {
      const argsHTML = node.args.map(renderMathML).join('<mo>,</mo>');
      return `<mrow><mi>${node.name}</mi><mo>&#x2061;</mo><mrow><mo>(</mo>${argsHTML}<mo>)</mo></mrow></mrow>`;
    }

    case 'vector':
      return `<mrow><mover>${renderMathML(node.value)}<mo>&#x2192;</mo></mover></mrow>`;

    case 'set': {
      const content = node.elements.map(renderMathML).join('<mo>,</mo>');
      return `<mrow><mo>{</mo>${content}<mo>}</mo></mrow>`;
    }

    case 'equation':
      return `<mrow>${renderMathML(node.expression)}</mrow>`;

    case 'equation_group':
      return `<mrow>${node.equations.map(renderMathML).join('')}</mrow>`;

    default:
      return '';
  }
}

function renderMatrixTable(rows) {
  const inner = rows.map(row => {
    const cells = row.map(cell => `<mtd>${renderMathML(cell)}</mtd>`).join('');
    return `<mtr>${cells}</mtr>`;
  }).join('');
  return `<mtable>${inner}</mtable>`;
}

function getMatrixDelimiters(variant) {
  switch (variant) {
    case 'bmatrix': return { open: '[', close: ']' };
    case 'pmatrix': return { open: '(', close: ')' };
    case 'vmatrix': return { open: '|', close: '|' };
    default: return null;
  }
}

function escapeMathML(str) {
  // Convert standard backslash commands to MathML entities or Unicode characters
  if (str.startsWith('\\')) {
    const cmd = str.slice(1);
    const unicodeMap = {
      alpha: '&#x3b1;', beta: '&#x3b2;', gamma: '&#x3b3;', delta: '&#x3b4;',
      epsilon: '&#x3b5;', zeta: '&#x3b6;', eta: '&#x3b7;', theta: '&#x3b8;',
      iota: '&#x3b9;', kappa: '&#x3ba;', lambda: '&#x3bb;', mu: '&#x3bc;',
      nu: '&#x3bd;', xi: '&#x3be;', pi: '&#x3c0;', rho: '&#x3c1;',
      sigma: '&#x3c3;', tau: '&#x3c4;', upsilon: '&#x3c5;', phi: '&#x3c6;',
      chi: '&#x3c7;', psi: '&#x3c8;', omega: '&#x3c9;',
      Gamma: '&#x393;', Delta: '&#x394;', Theta: '&#x398;', Lambda: '&#x39b;',
      Xi: '&#x39e;', Pi: '&#x3a0;', Sigma: '&#x3a3;', Upsilon: '&#x3a5;',
      Phi: '&#x3a6;', Psi: '&#x3a8;', Omega: '&#x3a9;',
      times: '&#xd7;', div: '&#xf7;', approx: '&#x2248;',
      le: '&#x2264;', ge: '&#x2265;', ne: '&#x2260;',
      to: '&#x2192;', gets: '&#x2190;',leftrightarrow: '&#x2194;',
      infty: '&#x221e;', partial: '&#x2202;', nabla: '&#x2207;',
      pm: '&#xb1;', mp: '&#x2213;', cdot: '&#x22c5;', ast: '&#x2217;', star: '&#x22c6;',
      forall: '&#x2200;', exists: '&#x2203;', neg: '&#xac;',
      land: '&#x2227;', lor: '&#x2228;', in: '&#x2208;', notin: '&#x2209;',
      subset: '&#x2282;', supset: '&#x2283;', subseteq: '&#x2286;', supseteq: '&#x2287;',
      cup: '&#x222a;', cap: '&#x2229;', varnothing: '&#x2205;', emptyset: '&#x2205;'
    };
    return unicodeMap[cmd] || `\\${cmd}`;
  }
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
