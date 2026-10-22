/**
 * Zolto Layout Engine — Flex Builder (Phase 8)
 *
 * Computes Flexbox and Stack CSS styles for @flex, @item, and @stack blocks.
 */

export function buildFlexStyles(node) {
  const styles = ['display: flex;'];

  if (node.direction === 'column') {
    styles.push('flex-direction: column;');
  } else {
    styles.push('flex-direction: row;');
  }

  if (node.wrap) {
    styles.push('flex-wrap: wrap;');
  } else {
    styles.push('flex-wrap: nowrap;');
  }

  if (node.justify) {
    styles.push(`justify-content: ${mapJustify(node.justify)};`);
  }

  if (node.align) {
    styles.push(`align-items: ${mapAlign(node.align)};`);
  }

  const gap = typeof node.gap === 'number' ? `${node.gap}px` : node.gap;
  if (gap) {
    styles.push(`gap: ${gap};`);
  }

  return styles.join(' ');
}

export function buildFlexItemStyles(node) {
  const styles = [];

  const grow = node.grow ?? 0;
  const shrink = node.shrink ?? 1;
  const basis = typeof node.basis === 'number' ? `${node.basis}px` : (node.basis ?? 'auto');

  styles.push(`flex: ${grow} ${shrink} ${basis};`);

  if (node.alignSelf && node.alignSelf !== 'auto') {
    styles.push(`align-self: ${mapAlign(node.alignSelf)};`);
  }

  return styles.join(' ');
}

export function buildStackStyles(node) {
  const styles = [];

  if (node.mode === 'overlay') {
    styles.push('position: relative; display: block;');
  } else {
    styles.push('display: flex; flex-direction: column;');
    const gap = typeof node.gap === 'number' ? `${node.gap}px` : node.gap;
    if (gap) styles.push(`gap: ${gap};`);
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
