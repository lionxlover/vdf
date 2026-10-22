/**
 * Zolto Layout Engine — CSS Style Rules Generator (Phase 8)
 *
 * Generates reusable CSS rules, responsive breakpoint media queries, and print styles.
 */

export const LAYOUT_BASE_CSS = `
/* Zolto Phase 8 Layout Engine Base Styles */
.zl-layout-container {
  box-sizing: border-box;
  width: 100%;
}

.zl-layout-header, .zl-layout-footer {
  box-sizing: border-box;
  width: 100%;
}

.zl-layout-main {
  box-sizing: border-box;
  flex: 1;
}

.zl-layout-sidebar, .zl-layout-navigation {
  box-sizing: border-box;
}

.zl-layout-section {
  box-sizing: border-box;
  margin-bottom: 24px;
}

.zl-layout-spacer {
  display: block;
}

/* Dark Theme Support for Layout Containers, Cards & Headings */
.zl-theme-dark {
  background-color: #0f1117;
  color: #f8fafc;
}
.zl-theme-dark h1, .zl-theme-dark h2, .zl-theme-dark h3,
.zl-theme-dark h4, .zl-theme-dark h5, .zl-theme-dark h6 {
  color: #ffffff !important;
}
.zl-theme-dark p, .zl-theme-dark li {
  color: #cbd5e1;
}
.zl-theme-dark .zl-card {
  background-color: #1e293b !important;
  color: #f8fafc !important;
  border-color: #334155 !important;
}
.zl-theme-dark .zl-card-title {
  color: #ffffff !important;
}

/* Slide Deck Presentation Styling & Contrast */
.zl-pres-theme-dark .zl-layout-slide h1, .zl-pres-theme-dark .zl-layout-slide h2, .zl-pres-theme-dark .zl-layout-slide h3,
.zl-pres-theme-dark .zl-layout-slide h4, .zl-pres-theme-dark .zl-layout-slide h5, .zl-pres-theme-dark .zl-layout-slide h6 {
  color: #ffffff !important;
}
.zl-pres-theme-dark .zl-layout-slide p, .zl-pres-theme-dark .zl-layout-slide li {
  color: #e2e8f0 !important;
}
.zl-slide-notes {
  display: none; /* Speaker notes hidden by default in slide deck presentation view */
}

/* Responsive SVG Scaling inside Cells & Grid Layouts */
.zl-layout-cell svg, .zl-layout-item svg, .zl-layout-container svg {
  max-width: 100% !important;
  height: auto !important;
  box-sizing: border-box;
}

@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }

  .zl-layout-page {
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    width: 100% !important;
    page-break-after: always;
    break-after: page;
  }

  .zl-slide-notes {
    display: block !important;
    margin-top: 16px;
    padding: 12px;
    background: #f7fafc;
    border: 1px solid #cbd5e0;
    font-size: 12px;
  }
}
`;

/**
 * Generate CSS for fluid sizing helpers clamp() and fluid()
 */
export function resolveFluidValue(val) {
  if (typeof val === 'number') return `${val}px`;
  if (typeof val !== 'string') return val;

  const fluidMatch = /^fluid\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)$/i.exec(val.trim());
  if (fluidMatch) {
    const min = fluidMatch[1];
    const max = fluidMatch[2];
    return `clamp(${min}px, 2vw, ${max}px)`;
  }

  return val;
}
