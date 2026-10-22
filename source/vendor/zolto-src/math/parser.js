/**
 * Zolto Math Parser — Phase 4
 * 
 * Pratt (top-down operator precedence) parser for Zolto Math AST.
 */

import * as AST from './ast.js';
import { MathDiagnostics } from './diagnostics.js';

const PRECEDENCE = {
  EOF: 0,
  RELATION: 10,  // = < > \le \ge \approx \ne
  ADD: 20,       // + -
  MULT: 30,      // * /
  IMPLICIT: 40,  // juxtaposition, e.g. 2x
  POW_SUB: 50,   // ^ _
};

export class MathParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.diags = new MathDiagnostics();
  }

  peek() {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  peekNext() {
    return this.tokens[this.pos + 1] || { type: 'EOF', value: '' };
  }

  advance() {
    const tok = this.peek();
    if (tok.type !== 'EOF') this.pos++;
    return tok;
  }

  match(type, value = null) {
    const tok = this.peek();
    if (tok.type === type && (value === null || tok.value === value)) {
      this.advance();
      return true;
    }
    return false;
  }

  consume(type, value = null, errMsg = '') {
    const tok = this.peek();
    if (tok.type === type && (value === null || tok.value === value)) {
      return this.advance();
    }
    this.diags.error('E002', errMsg || `Expected token ${type}${value ? ` "${value}"` : ''}, got ${tok.type}`, {
      line: tok.line,
      char: tok.char
    });
    return null;
  }

  parse() {
    const expr = this.parseExpression(0);
    if (this.peek().type !== 'EOF') {
      this.diags.error('E003', `Unexpected trailing token: ${this.peek().value}`, {
        line: this.peek().line,
        char: this.peek().char
      });
    }
    return { ast: expr, errors: this.diags.errors, warnings: this.diags.warnings };
  }

  parseExpression(precedence = 0) {
    let left = this.parsePrefix();
    if (!left) return null;

    while (true) {
      const tok = this.peek();
      const nextBP = this.getBindingPower(tok);

      if (precedence >= nextBP) break;

      // Handle implicit multiplication (juxtaposition)
      if (nextBP === PRECEDENCE.IMPLICIT) {
        left = AST.binaryExpression('*', left, this.parseExpression(nextBP));
        continue;
      }

      this.advance(); // consume infix token
      left = this.parseInfix(tok, left);
    }

    return left;
  }

  getBindingPower(tok) {
    if (tok.type === 'EOF') return PRECEDENCE.EOF;

    if (tok.type === 'OPERATOR') {
      if (['+', '-'].includes(tok.value)) return PRECEDENCE.ADD;
      if (['*', '/'].includes(tok.value)) return PRECEDENCE.MULT;
      if (['^', '_'].includes(tok.value)) return PRECEDENCE.POW_SUB;
      if (['=', '<', '>', '~'].includes(tok.value)) return PRECEDENCE.RELATION;
    }

    if (tok.type === 'COMMAND') {
      if (['approx', 'le', 'ge', 'ne', 'to', 'gets', 'leftrightarrow'].includes(tok.value)) return PRECEDENCE.RELATION;
    }

    // Implicit multiplication detection:
    // If the next token can start a prefix expression, we have juxtaposition
    if (this.canStartPrefix(tok)) {
      return PRECEDENCE.IMPLICIT;
    }

    return 0;
  }

  canStartPrefix(tok) {
    return ['NUMBER', 'IDENT', 'COMMAND', 'FUNCTION'].includes(tok.type) ||
           (tok.type === 'PUNCT' && ['(', '{', '['].includes(tok.value));
  }

  parsePrefix() {
    const tok = this.advance();

    switch (tok.type) {
      case 'NUMBER':
        return AST.number(tok.value);

      case 'IDENT':
        return AST.identifier(tok.value);

      case 'FUNCTION':
        return this.parseFunctionCall(tok);

      case 'COMMAND':
        return this.parseCommand(tok);

      case 'OPERATOR':
        if (tok.value === '-' || tok.value === '+') {
          return AST.unaryExpression(tok.value, this.parseExpression(100)); // high precedence for unary
        }
        this.diags.error('E004', `Unexpected operator: ${tok.value}`, { line: tok.line, char: tok.char });
        return null;

      case 'PUNCT':
        if (tok.value === '(') {
          const expr = this.parseExpression(0);
          this.consume('PUNCT', ')', 'Expected closing parenthesis ")"');
          return expr;
        }
        if (tok.value === '{') {
          const expr = this.parseExpression(0);
          this.consume('PUNCT', '}', 'Expected closing brace "}"');
          return expr;
        }
        if (tok.value === '[') {
          // Vector or list
          const elements = [];
          if (this.peek().value !== ']') {
            elements.push(this.parseExpression(0));
            while (this.match('PUNCT', ',')) {
              elements.push(this.parseExpression(0));
            }
          }
          this.consume('PUNCT', ']', 'Expected closing bracket "]"');
          return AST.vector(AST.set(elements));
        }
        break;

      default:
        break;
    }

    this.diags.error('E005', `Unexpected token in expression: ${tok.value}`, { line: tok.line, char: tok.char });
    return null;
  }

  parseInfix(tok, left) {
    if (tok.type === 'OPERATOR') {
      if (tok.value === '^') {
        return AST.power(left, this.parseExpression(PRECEDENCE.POW_SUB));
      }
      if (tok.value === '_') {
        return AST.subscript(left, this.parseExpression(PRECEDENCE.POW_SUB));
      }
      if (['+', '-', '*', '/'].includes(tok.value)) {
        return AST.binaryExpression(tok.value, left, this.parseExpression(this.getBindingPower(tok)));
      }
      if (['=', '<', '>', '~'].includes(tok.value)) {
        return AST.binaryExpression(tok.value, left, this.parseExpression(this.getBindingPower(tok)));
      }
    }

    if (tok.type === 'COMMAND') {
      if (['approx', 'le', 'ge', 'ne', 'to', 'gets', 'leftrightarrow'].includes(tok.value)) {
        return AST.binaryExpression('\\' + tok.value, left, this.parseExpression(this.getBindingPower(tok)));
      }
    }

    return left;
  }

  parseFunctionCall(tok) {
    // Functions can have parameters/arguments, e.g. sin(x) or sin x
    // If followed by '(', it's sin(x). Otherwise we parse next expression
    if (this.match('PUNCT', '(')) {
      const args = [];
      if (this.peek().value !== ')') {
        args.push(this.parseExpression(0));
        while (this.match('PUNCT', ',')) {
          args.push(this.parseExpression(0));
        }
      }
      this.consume('PUNCT', ')', 'Expected closing parenthesis in function call');
      return AST.functionCall(tok.value, args);
    } else {
      // e.g. sin x (parse next expression with implicit precedence)
      const arg = this.parseExpression(PRECEDENCE.IMPLICIT);
      return AST.functionCall(tok.value, [arg]);
    }
  }

  parseCommand(tok) {
    const name = tok.value;

    if (name === 'frac') {
      this.consume('PUNCT', '{', 'Expected "{" for fraction numerator');
      const num = this.parseExpression(0);
      this.consume('PUNCT', '}', 'Expected "}" for fraction numerator');

      this.consume('PUNCT', '{', 'Expected "{" for fraction denominator');
      const den = this.parseExpression(0);
      this.consume('PUNCT', '}', 'Expected "}" for fraction denominator');

      return AST.fraction(num, den);
    }

    if (name === 'sqrt') {
      let radix = null;
      if (this.match('PUNCT', '[')) {
        radix = this.parseExpression(0);
        this.consume('PUNCT', ']', 'Expected "]" for root index');
      }
      this.consume('PUNCT', '{', 'Expected "{" for root expression');
      const expr = this.parseExpression(0);
      this.consume('PUNCT', '}', 'Expected "}" for root expression');
      return AST.root(radix, expr);
    }

    if (['sum', 'prod', 'int'].includes(name)) {
      let under = null, over = null;
      // sum can have limits in any order, e.g. \sum_a^b or \sum^b_a
      while (true) {
        if (this.match('OPERATOR', '_')) {
          under = this.parseArg();
        } else if (this.match('OPERATOR', '^')) {
          over = this.parseArg();
        } else {
          break;
        }
      }

      if (name === 'sum') return AST.summation(under, over);
      if (name === 'prod') return AST.product(under, over);
      return AST.integral(name, under, over);
    }

    if (name === 'lim') {
      this.consume('OPERATOR', '_', 'Expected "_" for limit variable');
      // Limit bounds, e.g. x \to 0
      this.consume('PUNCT', '{', 'Expected "{" for limit range');
      const variable = this.parseExpression(PRECEDENCE.RELATION);
      this.consume('PUNCT', '}', 'Expected "}" for limit range');
      const expr = this.parseExpression(0);
      return AST.limit(variable, null, expr);
    }

    if (['matrix', 'bmatrix', 'pmatrix', 'vmatrix', 'cases', 'aligned'].includes(name.toLowerCase())) {
      this.consume('PUNCT', '{', `Expected "{" to start ${name} environment`);
      const rows = this.parseMatrixBody();
      this.consume('PUNCT', '}', `Expected "}" to end ${name} environment`);
      if (name.toLowerCase() === 'cases') {
        // Piecewise
        const piecewiseCases = rows.map(r => ({
          expression: r[0] || null,
          condition: r[1] || null
        }));
        return AST.piecewise(piecewiseCases);
      }
      return AST.matrix(name, rows);
    }

    // Default symbol representation
    return AST.identifier('\\' + name);
  }

  parseArg() {
    // Helper to parse subscript/superscript arguments (either a single token or bracketed block)
    if (this.match('PUNCT', '{')) {
      const expr = this.parseExpression(0);
      this.consume('PUNCT', '}', 'Expected closing brace "}" for limit/power argument');
      return expr;
    }
    return this.parseExpression(PRECEDENCE.POW_SUB);
  }

  parseMatrixBody() {
    // Parses matrices cells separated by '&' (or ',') and rows by '\\' (or ';')
    const rows = [];
    let currentRow = [];

    while (this.peek().type !== 'EOF' && this.peek().value !== '}') {
      const cellExpr = this.parseExpression(0);
      if (cellExpr) currentRow.push(cellExpr);

      if (this.match('PUNCT', '&') || this.match('PUNCT', ',')) {
        continue;
      } else if (this.match('PUNCT', '\\\\') || this.match('PUNCT', ';')) {
        rows.push(currentRow);
        currentRow = [];
      } else if (this.peek().value === '}') {
        break;
      } else {
        // Advance to avoid infinite loop
        this.advance();
      }
    }

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    return rows;
  }
}
