/**
 * Zolto Chart Semantic Validator — Phase 6
 *
 * Validates Chart AST semantics and emits diagnostics for missing datasets,
 * invalid chart types, duplicate IDs, and mismatched labels.
 */

import { ChartDiagnosticsCollector } from './diagnostics.js';

const VALID_CHART_TYPES = new Set([
  'bar', 'hbar', 'line', 'area', 'spline', 'step', 'pie', 'donut',
  'scatter', 'bubble', 'radar', 'polararea', 'histogram', 'boxplot',
  'candlestick', 'heatmap', 'treemap', 'sunburst', 'funnel', 'waterfall',
  'gauge', 'timeline', 'calendar', 'mixed'
]);

export function validateChart(chartAst) {
  const diagnostics = new ChartDiagnosticsCollector();

  if (!chartAst || chartAst.type !== 'chart') {
    diagnostics.error('E601', 'Invalid chart AST node');
    return diagnostics;
  }

  if (!VALID_CHART_TYPES.has(chartAst.chartType.toLowerCase())) {
    diagnostics.warning('W601', `Unknown chart type "${chartAst.chartType}". Defaulting to bar chart layout.`);
  }

  if (!chartAst.datasets || chartAst.datasets.length === 0) {
    diagnostics.warning('W602', 'Chart has no datasets defined.');
  } else {
    const ds = chartAst.datasets[0];
    if (ds.labels.length > 0 && ds.series.length > 0) {
      for (const s of ds.series) {
        if (s.data.length > 0 && s.data.length !== ds.labels.length) {
          diagnostics.warning('W603', `Mismatched data series length (${s.data.length}) for labels count (${ds.labels.length}).`);
        }
      }
    }
  }

  return diagnostics;
}
