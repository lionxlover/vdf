/**
 * Zolto Layout Engine — Presentation & Slide Deck Builder (Phase 8)
 *
 * Computes slide deck CSS styles and structure for @presentation and @slide blocks.
 */

export function buildPresentationContainerStyles(node) {
  const styles = [
    'display: flex;',
    'flex-direction: column;',
    'gap: 32px;',
    'align-items: center;',
    'padding: 32px 0;',
  ];

  return styles.join(' ');
}

export function buildSlideStyles(node, presNode) {
  const styles = [
    'box-sizing: border-box;',
    'position: relative;',
    'overflow: hidden;',
    'display: flex;',
    'flex-direction: column;',
    'padding: 48px;',
    'border-radius: 12px;',
  ];

  const ratio = presNode?.ratio ?? '16:9';
  if (ratio === '16:9') {
    styles.push('width: 960px; height: 540px;');
  } else if (ratio === '4:3') {
    styles.push('width: 800px; height: 600px;');
  } else {
    styles.push('width: 960px; height: 540px;');
  }

  const theme = presNode?.theme ?? 'dark';
  if (theme === 'pitch-dark' || theme === 'dark') {
    styles.push('background: #0f1117; color: #f7fafc; border: 1px solid #2d3748;');
  } else if (theme === 'light') {
    styles.push('background: #ffffff; color: #1a202c; border: 1px solid #e2e8f0;');
  } else {
    styles.push('background: #0f1117; color: #f7fafc; border: 1px solid #2d3748;');
  }

  const slideType = node.slideType ?? 'content';
  if (slideType === 'title') {
    styles.push('justify-content: center; align-items: center; text-align: center;');
  } else if (slideType === 'section') {
    styles.push('justify-content: center; align-items: flex-start;');
  }

  return styles.join(' ');
}
