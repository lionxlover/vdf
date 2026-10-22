/**
 * Zolto Layout Engine — AST Node Factories (Phase 8)
 *
 * Provides factory functions for all layout AST nodes.
 * Monomorphic object shapes for engine performance & stability.
 */

export const LAYOUT_NODE_TYPES = Object.freeze({
  LAYOUT:       'layout',
  HEADER:       'layout_header',
  MAIN:         'layout_main',
  FOOTER:       'layout_footer',
  SIDEBAR:      'layout_sidebar',
  NAVIGATION:   'layout_navigation',
  SECTION:      'layout_section',
  CONTAINER:    'layout_container',
  SPACER:       'layout_spacer',
  BOX:          'layout_box',
  GRID:         'layout_grid',
  CELL:         'layout_cell',
  FLEX:         'layout_flex',
  FLEX_ITEM:    'layout_item',
  STACK:        'layout_stack',
  CANVAS:       'layout_canvas',
  CANVAS_LAYER: 'canvas_layer',
  CANVAS_OBJECT:'canvas_object',
  PAGES:        'layout_pages',
  PAGE:         'layout_page',
  PRESENTATION: 'layout_presentation',
  SLIDE:        'layout_slide',
});

export function createLayoutNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.LAYOUT,
    width: attrs.width ?? 'auto',
    height: attrs.height ?? 'auto',
    padding: attrs.padding ?? 24,
    margin: attrs.margin ?? 0,
    gap: attrs.gap ?? 16,
    alignment: attrs.alignment ?? 'start',
    responsive: attrs.responsive !== false,
    theme: attrs.theme ?? 'default',
    breakpoints: attrs.breakpoints ?? [],
    children,
  };
}

export function createHeaderNode(attrs = {}, children = []) {
  return { type: LAYOUT_NODE_TYPES.HEADER, children };
}

export function createMainNode(attrs = {}, children = []) {
  return { type: LAYOUT_NODE_TYPES.MAIN, children };
}

export function createFooterNode(attrs = {}, children = []) {
  return { type: LAYOUT_NODE_TYPES.FOOTER, children };
}

export function createSidebarNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.SIDEBAR,
    width: attrs.width ?? 280,
    children,
  };
}

export function createNavigationNode(attrs = {}, children = []) {
  return { type: LAYOUT_NODE_TYPES.NAVIGATION, children };
}

export function createSectionNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.SECTION,
    id: attrs.id ?? null,
    children,
  };
}

export function createContainerNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.CONTAINER,
    width: attrs.width ?? 960,
    padding: attrs.padding ?? 24,
    children,
  };
}

export function createSpacerNode(attrs = {}) {
  return {
    type: LAYOUT_NODE_TYPES.SPACER,
    size: attrs.size ?? 24,
  };
}

export function createBoxNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.BOX,
    position: attrs.position ?? 'static', // static, relative, absolute, fixed, sticky
    top: attrs.top ?? null,
    left: attrs.left ?? null,
    right: attrs.right ?? null,
    bottom: attrs.bottom ?? null,
    x: attrs.x ?? null,
    y: attrs.y ?? null,
    w: attrs.w ?? attrs.width ?? null,
    h: attrs.h ?? attrs.height ?? null,
    z: attrs.z ?? attrs['z-index'] ?? null,
    anchor: attrs.anchor ?? null,
    children,
  };
}

export function createGridNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.GRID,
    columns: attrs.columns ?? 3,
    rows: attrs.rows ?? 'auto',
    gap: attrs.gap ?? 16,
    rowGap: attrs['row-gap'] ?? attrs.rowGap ?? attrs.gap ?? 16,
    columnGap: attrs['column-gap'] ?? attrs.columnGap ?? attrs.gap ?? 16,
    autoFit: attrs['auto-fit'] === true,
    autoFill: attrs['auto-fill'] === true,
    minCellWidth: attrs['min-cell-width'] ?? 240,
    align: attrs.align ?? 'stretch',
    justify: attrs.justify ?? 'start',
    areas: attrs.areas ?? null,
    responsiveOverrides: attrs.responsiveOverrides ?? [],
    children,
  };
}

export function createCellNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.CELL,
    span: attrs.span ?? 1,
    rowSpan: attrs['row-span'] ?? attrs.rowSpan ?? 1,
    area: attrs.area ?? null,
    align: attrs.align ?? 'stretch',
    children,
  };
}

export function createFlexNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.FLEX,
    direction: attrs.direction ?? 'row',
    wrap: attrs.wrap === true || attrs.wrap === 'true',
    justify: attrs.justify ?? 'start',
    align: attrs.align ?? 'stretch',
    gap: attrs.gap ?? 16,
    children,
  };
}

export function createFlexItemNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.FLEX_ITEM,
    grow: attrs.grow ?? 0,
    shrink: attrs.shrink ?? 1,
    basis: attrs.basis ?? 'auto',
    alignSelf: attrs['align-self'] ?? attrs.alignSelf ?? 'auto',
    children,
  };
}

export function createStackNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.STACK,
    gap: attrs.gap ?? 12,
    mode: attrs.mode ?? 'flow', // flow, overlay
    children,
  };
}

export function createCanvasNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.CANVAS,
    width: attrs.width ?? 1920,
    height: attrs.height ?? 1080,
    snap: attrs.snap ?? 8,
    guides: attrs.guides !== false,
    selectable: attrs.selectable !== false || attrs.selection === true,
    editable: attrs.editable === true,
    children,
  };
}

export function createCanvasLayerNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.CANVAS_LAYER,
    id: attrs.id ?? `layer-${Math.random().toString(36).slice(2, 8)}`,
    z: attrs.z ?? 0,
    locked: attrs.locked === true,
    visible: attrs.visible !== false,
    children,
  };
}

export function createCanvasObjectNode(objectType, attrs = {}, children = []) {
  const isText = objectType === 'text';
  return {
    type: LAYOUT_NODE_TYPES.CANVAS_OBJECT,
    objectType, // text, image, line, shape, rect, box
    x: attrs.x ?? 0,
    y: attrs.y ?? 0,
    w: attrs.w ?? attrs.width ?? (isText ? null : 100),
    h: attrs.h ?? attrs.height ?? (isText ? null : 100),
    z: attrs.z ?? 0,
    size: attrs.size ?? 16,
    weight: attrs.weight ?? 400,
    fill: attrs.fill ?? (isText ? '#ffffff' : null),
    stroke: attrs.stroke ?? null,
    src: attrs.src ?? null,
    shapeType: attrs.type ?? 'rect',
    radius: attrs.radius ?? 0,
    x1: attrs.x1 ?? 0,
    y1: attrs.y1 ?? 0,
    x2: attrs.x2 ?? 100,
    y2: attrs.y2 ?? 100,
    children,
  };
}

export function createPagesNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.PAGES,
    size: attrs.size ?? 'A4',
    margin: attrs.margin ?? 32,
    bleed: attrs.bleed ?? 0,
    columns: attrs.columns ?? 1,
    print: attrs.print !== false,
    duplex: attrs.duplex === true,
    children,
  };
}

export function createPageNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.PAGE,
    number: attrs.number ?? null,
    break: attrs.break ?? null,
    children,
  };
}

export function createPresentationNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.PRESENTATION,
    theme: attrs.theme ?? 'dark',
    ratio: attrs.ratio ?? '16:9',
    children,
  };
}

export function createSlideNode(attrs = {}, children = []) {
  return {
    type: LAYOUT_NODE_TYPES.SLIDE,
    slideType: attrs.type ?? 'content', // title, content, comparison, gallery, section
    children,
  };
}
