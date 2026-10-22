/**
 * Zolto Math Validator — Phase 4
 */

export const KNOWN_COMMANDS = new Set([
  // Core structures
  'frac', 'sqrt', 'sum', 'prod', 'int', 'lim',
  'matrix', 'bmatrix', 'pmatrix', 'vmatrix', 'cases', 'aligned',

  // Greek letters (lowercase)
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
  'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  
  // Greek letters (uppercase)
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon',
  'Phi', 'Psi', 'Omega',

  // Operators & Relations
  'times', 'div', 'approx', 'le', 'ge', 'ne', 'to', 'gets', 'leftrightarrow',
  'infty', 'partial', 'nabla', 'pm', 'mp', 'cdot', 'ast', 'star',

  // Logic & Sets
  'forall', 'exists', 'neg', 'land', 'lor', 'in', 'notin', 'subset', 'supset',
  'subseteq', 'supseteq', 'cup', 'cap', 'varnothing', 'emptyset'
]);

export function validateMathAST(node, diags) {
  if (!node) return;

  // Check unknown commands
  if (node.type === 'identifier' && node.name.startsWith('\\')) {
    const cmdName = node.name.slice(1);
    if (!KNOWN_COMMANDS.has(cmdName)) {
      diags.warn('W001', `Unknown mathematical command or symbol: "\\${cmdName}"`);
    }
  }

  // Check binary/unary operators
  if (node.type === 'binary') {
    validateMathAST(node.left, diags);
    validateMathAST(node.right, diags);
  } else if (node.type === 'unary') {
    validateMathAST(node.argument, diags);
  } else if (node.type === 'fraction') {
    validateMathAST(node.numerator, diags);
    validateMathAST(node.denominator, diags);
  } else if (node.type === 'root') {
    if (node.radix) validateMathAST(node.radix, diags);
    validateMathAST(node.expression, diags);
  } else if (node.type === 'power') {
    validateMathAST(node.base, diags);
    validateMathAST(node.exponent, diags);
  } else if (node.type === 'subscript') {
    validateMathAST(node.base, diags);
    validateMathAST(node.index, diags);
  } else if (node.type === 'matrix') {
    // Check invalid matrix rows (all rows should ideally have the same columns length)
    const expectedCols = node.rows[0] ? node.rows[0].length : 0;
    node.rows.forEach((row, idx) => {
      row.forEach(cell => validateMathAST(cell, diags));
      if (row.length !== expectedCols) {
        diags.warn('W002', `Matrix row ${idx + 1} has ${row.length} columns, expected ${expectedCols}`);
      }
    });
  } else if (node.type === 'function_call') {
    node.args.forEach(arg => validateMathAST(arg, diags));
  } else if (node.type === 'vector') {
    validateMathAST(node.value, diags);
  } else if (node.type === 'set') {
    node.elements.forEach(el => validateMathAST(el, diags));
  } else if (node.type === 'piecewise') {
    node.cases.forEach(c => {
      if (c.expression) validateMathAST(c.expression, diags);
      if (c.condition) validateMathAST(c.condition, diags);
    });
  } else if (node.type === 'equation') {
    validateMathAST(node.expression, diags);
  } else if (node.type === 'equation_group') {
    node.equations.forEach(eq => validateMathAST(eq, diags));
  }
}
