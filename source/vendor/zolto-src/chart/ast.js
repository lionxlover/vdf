/**
 * Zolto Chart AST Node Constructors & Factories — Phase 6
 *
 * Defines stable AST nodes for the native Chart Engine:
 * Chart, Dataset, Series, Axis, Legend, Label, Scale, Grid, Tick, Marker,
 * TooltipPlaceholder, AnimationPlaceholder.
 */

export const ChartNodeType = Object.freeze({
  CHART:                 'chart',
  DATASET:               'chart_dataset',
  SERIES:                'chart_series',
  AXIS:                  'chart_axis',
  LEGEND:                'chart_legend',
  LABEL:                 'chart_label',
  SCALE:                 'chart_scale',
  GRID:                  'chart_grid',
  TICK:                  'chart_tick',
  MARKER:                'chart_marker',
  TOOLTIP_PLACEHOLDER:   'chart_tooltip_placeholder',
  ANIMATION_PLACEHOLDER: 'chart_animation_placeholder',
});

/**
 * Creates a top-level Chart AST node.
 */
export function chartNode(chartType, opts = {}) {
  return {
    type: ChartNodeType.CHART,
    diagramType: chartType, // for backward compatibility with generic AST tools
    chartType: chartType,
    id: opts.id ?? null,
    title: opts.title ?? null,
    subtitle: opts.subtitle ?? null,
    theme: opts.theme ?? 'light',
    width: opts.width ?? 800,
    height: opts.height ?? 450,
    responsive: opts.responsive ?? true,
    animation: opts.animation ?? true,
    legend: opts.legend ?? true,
    colors: opts.colors ?? null,
    exportFormat: opts.exportFormat ?? 'svg',
    accessibility: opts.accessibility ?? true,
    aria: opts.aria ?? opts.title ?? `${chartType} chart`,
    attributes: opts.attributes ?? {},
    datasets: opts.datasets ?? [],
    axes: opts.axes ?? [],
    legendConfig: opts.legendConfig ?? null,
    tooltipConfig: opts.tooltipConfig ?? null,
    styleConfig: opts.styleConfig ?? null,
    animationConfig: opts.animationConfig ?? null,
    transformConfig: opts.transformConfig ?? null,
    statsConfig: opts.statsConfig ?? null,
    children: opts.children ?? [],
    raw: opts.raw ?? '',
  };
}

/**
 * Creates a Dataset AST node.
 */
export function datasetNode(id = 'default', labels = [], series = [], metadata = {}) {
  return {
    type: ChartNodeType.DATASET,
    id,
    labels: Array.isArray(labels) ? labels : [],
    series: Array.isArray(series) ? series : [],
    metadata: metadata ?? {},
  };
}

/**
 * Creates a Series AST node.
 */
export function seriesNode(name, data = [], opts = {}) {
  return {
    type: ChartNodeType.SERIES,
    name: name || 'Series',
    data: Array.isArray(data) ? data : [],
    seriesType: opts.type ?? null,
    color: opts.color ?? null,
    attributes: opts.attributes ?? {},
  };
}

/**
 * Creates an Axis AST node.
 */
export function axisNode(id, side = 'bottom', axisType = 'linear', opts = {}) {
  return {
    type: ChartNodeType.AXIS,
    id: id || side,
    side,
    axisType, // 'linear', 'log', 'time', 'category'
    title: opts.title ?? null,
    min: opts.min ?? null,
    max: opts.max ?? null,
    grid: opts.grid ?? true,
    ticks: opts.ticks ?? true,
    format: opts.format ?? null,
    rotate: opts.rotate ?? 0,
    base: opts.base ?? 10,
  };
}

/**
 * Creates a Legend AST node.
 */
export function legendNode(opts = {}) {
  return {
    type: ChartNodeType.LEGEND,
    show: opts.show ?? true,
    position: opts.position ?? 'right', // 'top', 'bottom', 'left', 'right'
    align: opts.align ?? 'center',
    orientation: opts.orientation ?? 'vertical',
    icons: opts.icons ?? true,
    group: opts.group ?? true,
    interactive: opts.interactive ?? true,
    accessibility: opts.accessibility ?? true,
  };
}

/**
 * Creates a Label AST node.
 */
export function labelNode(opts = {}) {
  return {
    type: ChartNodeType.LABEL,
    show: opts.show ?? true,
    position: opts.position ?? 'top',
    format: opts.format ?? 'number',
    precision: opts.precision ?? 2,
    rotate: opts.rotate ?? 0,
  };
}

/**
 * Creates a Scale AST node.
 */
export function scaleNode(type = 'linear', domain = [0, 100], range = [0, 100]) {
  return {
    type: ChartNodeType.SCALE,
    scaleType: type,
    domain,
    range,
  };
}

/**
 * Creates a Grid AST node.
 */
export function gridNode(opts = {}) {
  return {
    type: ChartNodeType.GRID,
    showX: opts.showX ?? true,
    showY: opts.showY ?? true,
    color: opts.color ?? null,
  };
}

/**
 * Creates a Tick AST node.
 */
export function tickNode(value, label, x, y) {
  return {
    type: ChartNodeType.TICK,
    value,
    label: label ?? String(value),
    x,
    y,
  };
}

/**
 * Creates a Marker AST node.
 */
export function markerNode(shape = 'circle', size = 6, color = null) {
  return {
    type: ChartNodeType.MARKER,
    shape,
    size,
    color,
  };
}

/**
 * Creates a TooltipPlaceholder AST node.
 */
export function tooltipPlaceholderNode(opts = {}) {
  return {
    type: ChartNodeType.TOOLTIP_PLACEHOLDER,
    show: opts.show ?? true,
    format: opts.format ?? '{label}: {value}',
    trigger: opts.trigger ?? 'hover',
    follow: opts.follow ?? true,
    accessibility: opts.accessibility ?? true,
    placeholder: true,
  };
}

/**
 * Creates an AnimationPlaceholder AST node.
 */
export function animationPlaceholderNode(opts = {}) {
  return {
    type: ChartNodeType.ANIMATION_PLACEHOLDER,
    enabled: opts.enabled ?? true,
    duration: opts.duration ?? 600,
    easing: opts.easing ?? 'ease-out',
    delay: opts.delay ?? 0,
    placeholder: true,
  };
}
