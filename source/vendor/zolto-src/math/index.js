/**
 * Zolto Math Engine API — Phase 4
 */

import { tokenize } from './tokenizer.js';
import { lex } from './lexer.js';
import { MathParser } from './parser.js';
import { validateMathAST } from './validator.js';
import { render } from './renderer.js';
import { MathDiagnostics } from './diagnostics.js';

export function parseMath(src) {
  const rawTokens = tokenize(src);
  const lexedTokens = lex(rawTokens);
  const parser = new MathParser(lexedTokens);
  const { ast, errors: parseErrors, warnings: parseWarnings } = parser.parse();

  // Validate AST
  const diags = new MathDiagnostics();
  validateMathAST(ast, diags);

  return {
    ast,
    errors: [...parseErrors, ...diags.errors],
    warnings: [...parseWarnings, ...diags.warnings]
  };
}

export function renderMath(ast, target = 'html', isDisplay = false, label = null, number = null) {
  return render(ast, target, isDisplay, label, number);
}

export function compileMath(src, target = 'html', isDisplay = false, label = null, number = null) {
  const { ast } = parseMath(src);
  return renderMath(ast, target, isDisplay, label, number);
}
