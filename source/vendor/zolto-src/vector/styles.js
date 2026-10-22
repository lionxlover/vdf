/**
 * Zolto Vector Style & Color Processing Engine — Phase 7
 *
 * Resolves HEX, RGB, RGBA, HSL, HSLA, theme tokens ($surface, $border),
 * linear/radial/conic gradients, patterns, and CSS filter strings.
 */

export const THEME_COLOR_TOKENS = {
  dark: {
    background: '#111318',
    surface: '#1a1f2b',
    border: '#2d3648',
    textPrimary: '#ffffff',
    textSecondary: '#a8b0c2',
    accent: '#7c5cff',
    onAccent: '#ffffff',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    border: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    accent: '#6366f1',
    onAccent: '#ffffff',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
  },
  neo: {
    background: '#0d1117',
    surface: '#161b22',
    border: '#30363d',
    textPrimary: '#58a6ff',
    textSecondary: '#8b949e',
    accent: '#2f81f7',
    onAccent: '#ffffff',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
  },
  night: {
    background: '#090d16',
    surface: '#111827',
    border: '#1f2937',
    textPrimary: '#f3f4f6',
    textSecondary: '#9ca3af',
    accent: '#8b5cf6',
    onAccent: '#ffffff',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
};

export function resolveColorToken(colorStr, themeName = 'dark') {
  if (!colorStr) return null;
  const theme = THEME_COLOR_TOKENS[themeName] || THEME_COLOR_TOKENS.dark;

  if (colorStr.startsWith('gradient:')) {
    const gradId = colorStr.slice(9);
    return `url(#${gradId})`;
  }

  if (colorStr.startsWith('$')) {
    const tokenName = colorStr.slice(1);
    return theme[tokenName] || colorStr;
  }
  return colorStr;
}

export function parseStyleString(styleStr) {
  if (!styleStr) return {};
  const props = {};
  const pairs = styleStr.split(';').map(s => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const idx = pair.indexOf(':');
    if (idx !== -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      props[k] = v;
    }
  }
  return props;
}
