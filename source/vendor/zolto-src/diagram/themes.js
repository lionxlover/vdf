/**
 * Zolto Diagram Styling & Theme Registry — Phase 5
 *
 * Theme definitions and design tokens for native diagram rendering.
 */

export const LIGHT_THEME = Object.freeze({
  name: 'light',
  background: '#ffffff',
  surface: '#f8fafc',
  nodeFill: '#ffffff',
  nodeStroke: '#cbd5e1',
  nodeStrokeWidth: 2,
  nodeRadius: 8,
  textColor: '#0f172a',
  subtextColor: '#64748b',
  edgeColor: '#64748b',
  edgeWidth: 2,
  accentColor: '#3b82f6',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  fontWeight: '500',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  opacity: 1,
});

export const DARK_THEME = Object.freeze({
  name: 'dark',
  background: '#0f172a',
  surface: '#1e293b',
  nodeFill: '#1e293b',
  nodeStroke: '#334155',
  nodeStrokeWidth: 2,
  nodeRadius: 8,
  textColor: '#f8fafc',
  subtextColor: '#94a3b8',
  edgeColor: '#94a3b8',
  edgeWidth: 2,
  accentColor: '#38bdf8',
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  fontWeight: '500',
  shadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
  opacity: 1,
});

export const NEO_THEME = Object.freeze({
  name: 'custom:neo',
  background: '#090d16',
  surface: '#121a2d',
  nodeFill: '#131e36',
  nodeStroke: '#38bdf8',
  nodeStrokeWidth: 2,
  nodeRadius: 12,
  textColor: '#f0f9ff',
  subtextColor: '#7dd3fc',
  edgeColor: '#38bdf8',
  edgeWidth: 2,
  accentColor: '#22c55e',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '600',
  shadow: '0 0 15px rgba(56, 189, 248, 0.25)',
  opacity: 1,
});

export const NIGHT_THEME = Object.freeze({
  name: 'custom:night',
  background: '#050508',
  surface: '#0d0d14',
  nodeFill: '#141420',
  nodeStroke: '#a855f7',
  nodeStrokeWidth: 2,
  nodeRadius: 16,
  textColor: '#faf5ff',
  subtextColor: '#c084fc',
  edgeColor: '#c084fc',
  edgeWidth: 2,
  accentColor: '#ec4899',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '600',
  shadow: '0 0 20px rgba(168, 85, 247, 0.3)',
  opacity: 1,
});

const THEME_REGISTRY = new Map([
  ['light', LIGHT_THEME],
  ['dark', DARK_THEME],
  ['custom:neo', NEO_THEME],
  ['custom:night', NIGHT_THEME],
]);

/**
 * Resolves a theme name to a full theme design token object.
 */
export function getTheme(themeName = 'light') {
  const norm = (themeName || 'light').toLowerCase();
  if (THEME_REGISTRY.has(norm)) {
    return THEME_REGISTRY.get(norm);
  }
  if (norm.startsWith('custom:')) {
    return { ...DARK_THEME, name: norm };
  }
  return LIGHT_THEME;
}

/**
 * Registers a custom theme.
 */
export function registerTheme(name, themeTokens) {
  THEME_REGISTRY.set(name.toLowerCase(), {
    ...LIGHT_THEME,
    ...themeTokens,
    name,
  });
}
