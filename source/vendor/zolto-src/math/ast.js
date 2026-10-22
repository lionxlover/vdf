/**
 * Zolto Math AST Node Factories — Phase 4
 */

export function number(value) {
  return { type: 'number', value: String(value) };
}

export function identifier(name) {
  return { type: 'identifier', name: String(name) };
}

export function operator(name) {
  return { type: 'operator', name: String(name) };
}

export function unaryExpression(op, argument) {
  return { type: 'unary', op: String(op), argument };
}

export function binaryExpression(op, left, right) {
  return { type: 'binary', op: String(op), left, right };
}

export function fraction(numerator, denominator) {
  return { type: 'fraction', numerator, denominator };
}

export function root(radix, expression) {
  return { type: 'root', radix: radix || null, expression };
}

export function power(base, exponent) {
  return { type: 'power', base, exponent };
}

export function subscript(base, index) {
  return { type: 'subscript', base, index };
}

export function integral(symbol, under, over) {
  return { type: 'integral', symbol: String(symbol || 'int'), under: under || null, over: over || null };
}

export function summation(under, over) {
  return { type: 'summation', under: under || null, over: over || null };
}

export function product(under, over) {
  return { type: 'product', under: under || null, over: over || null };
}

export function limit(variable, to, expression) {
  return { type: 'limit', variable, to, expression };
}

export function matrix(variant, rows) {
  return { type: 'matrix', variant: String(variant || 'matrix').toLowerCase(), rows };
}

export function functionCall(name, args = []) {
  return { type: 'function_call', name: String(name), args };
}

export function vector(value) {
  return { type: 'vector', value };
}

export function set(elements = []) {
  return { type: 'set', elements };
}

export function piecewise(cases = []) {
  return { type: 'piecewise', cases };
}

export function equation(label, expression, num = null) {
  return { type: 'equation', label: label || null, expression, number: num };
}

export function equationGroup(equations = []) {
  return { type: 'equation_group', equations };
}
