/**
 * Zolto Chart Themes & Color Palettes — Phase 6
 *
 * Design tokens and color palettes for charts:
 * 'light', 'dark', 'custom:neo', 'custom:night', etc.
 */

export const CHART_PALETTES = Object.freeze({
  default:  ['#4f46e5', '#22c55e', '#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308'],
  neo:      ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#fbbf24'],
  night:    ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6'],
  pastel:   ['#93c5fd', '#86efac', '#fdba74', '#fde047', '#f472b6', '#c084fc'],
  monochrome: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
});

export const CHART_THEMES = Object.freeze({
  light: {
    name: 'light',
    background: '#ffffff',
    surface: '#f8fafc',
    textColor: '#1e293b',
    textSecondary: '#64748b',
    gridColor: '#e2e8f0',
    axisColor: '#94a3b8',
    colors: CHART_PALETTES.default,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  dark: {
    name: 'dark',
    background: '#15171b',
    surface: '#1e2228',
    textColor: '#f8fafc',
    textSecondary: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.08)',
    axisColor: '#475569',
    colors: CHART_PALETTES.neo,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  'custom:neo': {
    name: 'custom:neo',
    background: '#090d16',
    surface: '#111827',
    textColor: '#f3f4f6',
    textSecondary: '#9ca3af',
    gridColor: 'rgba(56, 189, 248, 0.12)',
    axisColor: '#38bdf8',
    colors: CHART_PALETTES.neo,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  'custom:night': {
    name: 'custom:night',
    background: '#0b0f19',
    surface: '#1e293b',
    textColor: '#e2e8f0',
    textSecondary: '#94a3b8',
    gridColor: 'rgba(255, 255, 255, 0.06)',
    axisColor: '#64748b',
    colors: CHART_PALETTES.night,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
});

export function getChartTheme(themeName = 'light', customColors = null) {
  const base = CHART_THEMES[themeName] ?? CHART_THEMES.light;
  if (Array.isArray(customColors) && customColors.length > 0) {
    return { ...base, colors: customColors };
  }
  return base;
}
