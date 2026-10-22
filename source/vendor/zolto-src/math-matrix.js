/**
 * Zolto Math Matrix/Environment Parser — Phase 4
 *
 * Handles `\begin{env} … \end{env}` for all supported matrix and aligned
 * environments (matrix, pmatrix, bmatrix, vmatrix, Vmatrix, Bmatrix,
 * smallmatrix, cases, aligned, align, gather, array, split).
 *
 * Exported as a mixin installer (`installMatrixMethods`) rather than a
 * standalone class, so math-parser.js can attach these methods to its
 * `MathParser` prototype without a circular import — this file never
 * imports math-parser.js.
 */

import * as A from './math-ast.js';

/**
 * @param {Function} MathParserClass  The MathParser class from math-parser.js
 * @param {{ MATRIX_ENVIRONMENTS: Set<string>, MATRIX_DELIMS: object, MT: object, A: object }} deps
 */
export function installMatrixMethods(MathParserClass, deps) {
  const { MATRIX_ENVIRONMENTS, MATRIX_DELIMS, MT } = deps;

  /**
   * `\begin{name} … \end{name}` — reads the environment name, dispatches
   * to row parsing, and wraps the result according to environment kind.
   */
  MathParserClass.prototype.parseEnvironment = function parseEnvironment() {
    const envName = this.readEnvName();
    if (!MATRIX_ENVIRONMENTS.has(envName)) {
      this.error(`Unknown environment: ${envName}`);
      // Best-effort recovery: consume until the matching \end and discard.
      this.skipUntilEnd(envName);
      return A.mError(`Unknown environment: ${envName}`, envName);
    }

    const rows = this.parseMatrixRows(envName);
    this.expectEnvEnd(envName);

    return A.mMatrix(envName, rows);
  };

  /** Reads `{envname}` immediately following `\begin`. */
  MathParserClass.prototype.readEnvName = function readEnvName() {
    if (!this.at(MT.LBRACE)) { this.error('Expected environment name after \\begin'); return ''; }
    this.advance(); // {
    let name = '';
    while (!this.at(MT.RBRACE) && !this.isEOF()) {
      const t = this.advance();
      name += typeof t.value === 'string' ? t.value : '';
    }
    if (this.at(MT.RBRACE)) this.advance();
    return name;
  };

  /**
   * Parses rows separated by `\\` and cells separated by `&`, stopping at
   * `\end{envName}`. Each row becomes a Row node; each cell a Cell node.
   */
  MathParserClass.prototype.parseMatrixRows = function parseMatrixRows(envName) {
    const rows = [];
    let currentRowCells = [];
    let guard = 0;

    const atRowEnd = () =>
      this.at(MT.NEWLINE) || this.isEnvEnd() || this.isEOF();

    for (;;) {
      const cellItems = this.parseSequenceUntil(() =>
        this.at(MT.AMP) || atRowEnd()
      );
      currentRowCells.push(A.mCell(cellItems.length === 1 ? cellItems[0] : A.mSequence(cellItems)));

      if (this.at(MT.AMP)) { this.advance(); continue; }

      // Row finished — flush it.
      rows.push(A.mRow(currentRowCells));
      currentRowCells = [];

      if (this.at(MT.NEWLINE)) { this.advance(); if (this.isEnvEnd() || this.isEOF()) break; continue; }
      break; // \end{...} or EOF
    }

    if (++guard > 10000) this.error(`Matrix "${envName}" exceeded row safety limit`);
    return rows;
  };

  /** True if the upcoming tokens are exactly `\end { envName }` for ANY name (lookahead only, no consume). */
  MathParserClass.prototype.isEnvEnd = function isEnvEnd() {
    return this.at(MT.COMMAND, 'end');
  };

  /** Consumes `\end{envName}`, erroring (but recovering) if the name doesn't match. */
  MathParserClass.prototype.expectEnvEnd = function expectEnvEnd(envName) {
    if (!this.at(MT.COMMAND, 'end')) {
      this.error(`Unclosed environment: missing \\end{${envName}}`);
      return;
    }
    this.advance(); // \end
    const closeName = this.readEnvName();
    if (closeName !== envName) {
      this.error(`Mismatched environment: \\begin{${envName}} closed by \\end{${closeName}}`);
    }
  };

  /** Recovery helper: skip tokens until a matching \end{envName} or EOF. */
  MathParserClass.prototype.skipUntilEnd = function skipUntilEnd(envName) {
    let guard = 0;
    while (!this.isEOF() && ++guard < 20000) {
      if (this.at(MT.COMMAND, 'end')) {
        const save = this.pos;
        this.advance();
        const name = this.readEnvName();
        if (name === envName) return;
        this.pos = save; this.advance(); // avoid infinite loop on mismatched \end
        continue;
      }
      this.advance();
    }
  };
}
