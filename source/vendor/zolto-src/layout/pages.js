/**
 * Zolto Layout Engine — Pages & Print Builder (Phase 8)
 *
 * Computes multi-page document and print layout CSS for @pages and @page blocks.
 */

export function buildPagesContainerStyles(node) {
  const styles = ['display: flex; flex-direction: column;'];

  const margin = typeof node.margin === 'number' ? `${node.margin}px` : node.margin;
  if (margin) styles.push(`padding: ${margin};`);

  const gap = typeof node.gap === 'number' ? `${node.gap}px` : (node.gap ?? 24);
  styles.push(`gap: ${typeof gap === 'number' ? `${gap}px` : gap};`);

  return styles.join(' ');
}

export function buildPageStyles(node, pagesNode) {
  const styles = [
    'box-sizing: border-box;',
    'position: relative;',
    'background: #ffffff;',
    'color: #1a202c;',
  ];

  const size = pagesNode?.size ?? 'A4';
  const sizeDims = getPageDimensions(size);
  if (sizeDims) {
    styles.push(`width: ${sizeDims.width};`);
    styles.push(`min-height: ${sizeDims.height};`);
  }

  const margin = pagesNode?.margin ?? 32;
  const paddingStr = typeof margin === 'number' ? `${margin}px` : margin;
  styles.push(`padding: ${paddingStr};`);

  styles.push('box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);');
  styles.push('border-radius: 4px;');

  if (node.break === 'before' || node.break === 'always') {
    styles.push('break-before: page; page-break-before: always;');
  }
  if (node.break === 'after') {
    styles.push('break-after: page; page-break-after: always;');
  }

  return styles.join(' ');
}

export function getPageDimensions(sizeStr) {
  const s = String(sizeStr).toUpperCase();
  if (s === 'A4') return { width: '210mm', height: '297mm' };
  if (s === 'LETTER') return { width: '8.5in', height: '11in' };
  if (s === 'LEGAL') return { width: '8.5in', height: '14in' };
  return null;
}
