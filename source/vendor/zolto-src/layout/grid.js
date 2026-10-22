/**
 * Zolto Layout Engine — Grid Builder (Phase 8)
 *
 * Computes grid CSS styles for @grid and @cell layout containers.
 */

export function buildGridStyles(node) {
  const styles = [];

  styles.push('display: grid;');

  if (node.areas) {
    // Format named grid-template-areas
    const cleanAreas = String(node.areas)
      .trim()
      .split(/\r?\n|\\n/)
      .map(line => `"${line.trim()}"`)
      .filter(l => l !== '""')
      .join(' ');
    styles.push(`grid-template-areas: ${cleanAreas};`);
  }

  if (node.autoFit || node.autoFill) {
    const mode = node.autoFit ? 'auto-fit' : 'auto-fill';
    const minW = typeof node.minCellWidth === 'number' ? `${node.minCellWidth}px` : node.minCellWidth;
    styles.push(`grid-template-columns: repeat(${mode}, minmax(${minW}, 1fr));`);
  } else if (typeof node.columns === 'number') {
    styles.push(`grid-template-columns: repeat(${node.columns}, minmax(0, 1fr));`);
  } else if (typeof node.columns === 'string') {
    styles.push(`grid-template-columns: ${node.columns};`);
  }

  if (node.rows && node.rows !== 'auto') {
    if (typeof node.rows === 'number') {
      styles.push(`grid-template-rows: repeat(${node.rows}, minmax(0, 1fr));`);
    } else {
      styles.push(`grid-template-rows: ${node.rows};`);
    }
  }

  const rowGap = typeof node.rowGap === 'number' ? `${node.rowGap}px` : node.rowGap;
  const colGap = typeof node.columnGap === 'number' ? `${node.columnGap}px` : node.columnGap;
  if (rowGap === colGap) {
    styles.push(`gap: ${rowGap};`);
  } else {
    styles.push(`row-gap: ${rowGap}; column-gap: ${colGap};`);
  }

  if (node.align) styles.push(`align-items: ${mapAlign(node.align)};`);
  if (node.justify) styles.push(`justify-items: ${mapJustify(node.justify)};`);

  return styles.join(' ');
}

export function buildCellStyles(node) {
  const styles = [];

  if (node.area) {
    styles.push(`grid-area: ${node.area};`);
  }

  if (node.span && node.span > 1) {
    styles.push(`grid-column: span ${node.span};`);
  }

  if (node.rowSpan && node.rowSpan > 1) {
    styles.push(`grid-row: span ${node.rowSpan};`);
  }

  if (node.align && node.align !== 'stretch') {
    styles.push(`align-self: ${mapAlign(node.align)};`);
  }

  return styles.join(' ');
}

function mapAlign(val) {
  if (val === 'start') return 'flex-start';
  if (val === 'end') return 'flex-end';
  return val;
}

function mapJustify(val) {
  if (val === 'start') return 'flex-start';
  if (val === 'end') return 'flex-end';
  return val;
}
