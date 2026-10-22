/**
 * Zolto Directive Renderer — Phase 3
 *
 * Renders all Phase 3 AST directive nodes to semantic, accessible HTML.
 * Receives renderBlock + renderInline as helpers (no circular imports).
 * Injects PHASE3_CSS once via <style id="zl-p3"> when directives are present.
 */

import { escapeHtml, escapeAttr } from './tokenizer.js';
import { PHASE3_NODE_TYPES }      from './ast.js';

// ─── Phase 3 CSS  (token-aware, with fallbacks) ──────────────────────────────

export const PHASE3_CSS = `
.zl-embed{margin:1.5em 0}.zl-embed-ratio{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius-md,12px);background:var(--bg-surface,#1a1d23)}.zl-embed-ratio iframe,.zl-embed-ratio video,.zl-embed-ratio embed{position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:var(--radius-md,12px)}.zl-embed-img{max-width:100%;height:auto;display:block;border-radius:var(--radius-md,12px)}.zl-embed-cap{margin-top:.45em;font-size:.875em;color:var(--text-secondary,#9ca3af);text-align:center;font-style:italic}
.zl-collapse{margin:1em 0;border:1px solid var(--border-base,rgba(255,255,255,.10));border-radius:var(--radius-md,12px);overflow:hidden}.zl-collapse summary{padding:.85em 1.1em;cursor:pointer;font-weight:600;color:var(--text-primary,#f4f5f7);background:var(--bg-surface,#1a1d23);display:flex;align-items:center;justify-content:space-between;list-style:none;-webkit-appearance:none;transition:background .2s}.zl-collapse summary:hover{background:var(--bg-glass-hover,rgba(255,255,255,.07))}.zl-collapse summary::-webkit-details-marker{display:none}.zl-collapse summary::after{content:"›";font-size:1.2em;transition:transform .3s;flex-shrink:0;opacity:.6}.zl-collapse[open] summary::after{transform:rotate(90deg)}.zl-collapse-body{padding:1em 1.1em;border-top:1px solid var(--border-subtle,rgba(255,255,255,.06));background:var(--bg-glass-soft,rgba(255,255,255,.03))}
.zl-tabs{margin:1em 0;border:1px solid var(--border-base,rgba(255,255,255,.10));border-radius:var(--radius-md,12px);overflow:hidden}.zl-tab-list{display:flex;overflow-x:auto;background:var(--bg-surface,#1a1d23);border-bottom:1px solid var(--border-base,rgba(255,255,255,.10))}.zl-tab-btn{flex-shrink:0;padding:.6em 1.1em;font-size:.875em;font-weight:500;color:var(--text-secondary,#9ca3af);border:none;border-bottom:2px solid transparent;background:none;cursor:pointer;transition:all .2s;font-family:inherit}.zl-tab-btn:hover{color:var(--text-primary,#f4f5f7);background:var(--bg-glass-hover,rgba(255,255,255,.07))}.zl-tab-btn[aria-selected="true"]{color:var(--primary,#5b9dfa);border-bottom-color:var(--primary,#5b9dfa)}.zl-tab-panel{padding:1.1em 1.2em;background:var(--bg-glass-soft,rgba(255,255,255,.03))}
.zl-card{background:var(--bg-surface,#1a1d23);border:1px solid var(--border-base,rgba(255,255,255,.10));border-radius:var(--radius-md,12px);padding:1.2em;transition:transform .2s,box-shadow .2s;overflow:hidden}.zl-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}.zl-card-primary{border-color:var(--primary,#5b9dfa);background:rgba(91,157,250,.08)}.zl-card-success{border-color:var(--accent-green,#5ee29a);background:rgba(94,226,154,.07)}.zl-card-warning{border-color:var(--accent-amber,#fab95b);background:rgba(250,185,91,.07)}.zl-card-danger{border-color:var(--accent-red,#f28b82);background:rgba(242,139,130,.07)}.zl-card-outline{background:transparent}.zl-card-ghost{background:transparent;border-color:transparent}.zl-card-ghost:hover{border-color:var(--border-base,rgba(255,255,255,.10));background:var(--bg-glass-soft,rgba(255,255,255,.03))}.zl-card-img{width:calc(100% + 2.4em);margin:-1.2em -1.2em .9em;display:block;height:160px;object-fit:cover}.zl-card-hdr{display:flex;align-items:center;gap:.5em;margin-bottom:.4em}.zl-card-icon{font-size:1.1em;color:var(--primary,#5b9dfa);line-he.zl-card-title{font-weight:700;color:var(--text-primary,#f4f5f7);font-size:.95em;overflow-wrap:anywhere;word-break:break-word}.zl-card-desc{font-size:.875em;color:var(--text-secondary,#9ca3af);margin-bottom:.45em;overflow-wrap:anywhere;word-break:break-word}.zl-card-group{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1em;margin:1em 0}.zl-cg-1{grid-template-columns:1fr}.zl-cg-2{grid-template-columns:repeat(2,1fr)}.zl-cg-3{grid-template-columns:repeat(3,1fr)}.zl-cg-4{grid-template-columns:repeat(4,1fr)}
.zl-steps{list-style:none;margin:1.2em 0;padding:0}.zl-step{display:flex;gap:.9em;margin-bottom:1.4em;position:relative;counter-increment:zl-step}.zl-step:not(:last-child)::after{content:"";position:absolute;left:1.05em;top:2.4em;bottom:-.4em;width:2px;background:var(--border-base,rgba(255,255,255,.10))}.zl-step-marker{flex-shrink:0;width:2.1em;height:2.1em;border-radius:50%;background:var(--bg-surface,#1a1d23);border:2px solid var(--primary,#5b9dfa);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--primary,#5b9dfa);font-size:.875em;z-index:1}.zl-step-content{flex:1;min-width:0;padding-top:.2em;overflow-wrap:anywhere;word-break:break-word}.zl-step-title{font-weight:600;color:var(--text-primary,#f4f5f7);margin-bottom:.35em}.zl-step-body{color:var(--text-secondary,#9ca3af)}
.zl-columns{display:flex;gap:1.5em;margin:1em 0;align-items:flex-start;flex-wrap:wrap}.zl-column{flex:1;min-width:180px}
.zl-badge{display:inline-flex;align-items:center;gap:.25em;padding:.2em .6em;border-radius:var(--radius-sm,8px);font-size:.75em;font-weight:600;vertical-align:middle;line-height:1.4;overflow-wrap:anywhere;word-break:break-word}.zl-badge-pill{border-radius:var(--radius-pill,9999px)}.zl-badge-primary{background:rgba(91,157,250,.15);color:var(--primary,#5b9dfa)}.zl-badge-success{background:rgba(94,226,154,.15);color:var(--accent-green,#5ee29a)}.zl-badge-warning{background:rgba(250,185,91,.15);color:var(--accent-amber,#fab95b)}.zl-badge-danger{background:rgba(242,139,130,.15);color:var(--accent-red,#f28b82)}.zl-badge-info{background:rgba(91,157,250,.12);color:var(--primary,#5b9dfa)}.zl-badge-neutral{background:var(--bg-glass-soft,rgba(255,255,255,.06));color:var(--text-secondary,#9ca3af)}.zl-badge-secondary{background:rgba(157,122,250,.15);color:var(--accent-purple,#9d7afa)}.zl-badge-outline{background:transparent !important;border:1.5px solid currentColor}
.zl-tag{display:inline-flex;align-items:center;gap:.25em;padding:.2em .55em;border-radius:var(--radius-pill,9999px);font-size:.8em;font-weight:500;background:var(--bg-surface,#1a1d23);border:1px solid var(--border-base,rgba(255,255,255,.10));color:var(--text-secondary,#9ca3af);text-decoration:none;transition:all .2s;cursor:default;margin:.1em;overflow-wrap:anywhere;word-break:break-word}a.zl-tag:hover{color:var(--text-primary,#f4f5f7);border-color:var(--border-strong,rgba(255,255,255,.18));cursor:pointer}
.zl-alert{display:flex;align-items:flex-start;gap:.75em;padding:.9em 1.1em;border-radius:var(--radius-md,12px);border:1px solid;margin:1em 0;position:relative;overflow-wrap:anywhere;word-break:break-word}.zl-alert-info{background:rgba(91,157,250,.07);border-color:var(--primary,#5b9dfa)}.zl-alert-success{background:rgba(94,226,154,.07);border-color:var(--accent-green,#5ee29a)}.zl-alert-warning{background:rgba(250,185,91,.07);border-color:var(--accent-amber,#fab95b)}.zl-alert-danger{background:rgba(242,139,130,.07);border-color:var(--accent-red,#f28b82)}.zl-alert-note{background:rgba(157,122,250,.07);border-color:var(--accent-purple,#9d7afa)}.zl-alert-primary{background:rgba(91,157,250,.10);border-color:var(--primary,#5b9dfa)}.zl-alert-icon{font-size:1.15em;flex-shrink:0;margin-top:.05em;font-variation-settings:"FILL" 1,"wght" 400,"GRAD" 0,"opsz" 20}.zl-alert-body{flex:1;min-width:0}.zl-alert-title{font-weight:700;color:var(--text-primary,#f4f5f7);margin-bottom:.22em;font-size:.92em}.zl-alert-close{position:absolute;top:.65em;right:.65em;background:none;border:none;color:inherit;cursor:pointer;opacity:.45;font-size:1em;line-height:1;padding:0;transition:opacity .2s}.zl-alert-close:hover{opacity:1}
.zl-timeline{margin:1.5em 0;padding-left:1.4em;border-left:2px solid var(--border-base,rgba(255,255,255,.10))}.zl-event{position:relative;margin-bottom:1.4em;padding-left:1.1em;overflow-wrap:anywhere;word-break:break-word}.zl-event::before{content:"";position:absolute;left:-1.7em;top:.35em;width:10px;height:10px;border-radius:50%;background:var(--primary,#5b9dfa);border:2px solid var(--bg-base,#0b0d0f);box-shadow:0 0 0 2px var(--primary,#5b9dfa)}.zl-event-date{font-size:.8em;color:var(--text-tertiary,#5c6270);display:block;margin-bottom:.2em}.zl-event-title{font-weight:600;color:var(--text-primary,#f4f5f7);margin-bottom:.3em}.zl-event-body{color:var(--text-secondary,#9ca3af)}
.zl-progress{margin:1em 0}.zl-progress-hdr{display:flex;justify-content:space-between;margin-bottom:.4em;font-size:.875em}.zl-progress-label{color:var(--text-secondary,#9ca3af)}.zl-progress-pct{color:var(--text-primary,#f4f5f7);font-weight:600}.zl-progress-track{background:var(--bg-surface,#1a1d23);border:1px solid var(--border-base,rgba(255,255,255,.10));border-radius:var(--radius-pill,9999px);height:8px;overflow:hidden}.zl-progress-bar{height:100%;border-radius:var(--radius-pill,9999px);background:var(--primary,#5b9dfa);transition:width .6s ease}.zl-pb-primary{background:var(--primary,#5b9dfa)}.zl-pb-success{background:var(--accent-green,#5ee29a)}.zl-pb-warning{background:var(--accent-amber,#fab95b)}.zl-pb-danger{background:var(--accent-red,#f28b82)}
.zl-avatar{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;position:relative;flex-shrink:0;background:var(--bg-surface,#1a1d23);border:1px solid var(--border-base,rgba(255,255,255,.10))}.zl-avatar img{width:100%;height:100%;object-fit:cover}.zl-avatar-initials{font-weight:700;letter-spacing:.03em;color:var(--text-primary,#f4f5f7)}.zl-av-xs{width:24px;height:24px;font-size:.65em}.zl-av-sm{width:32px;height:32px;font-size:.75em}.zl-av-md{width:40px;height:40px;font-size:.875em}.zl-av-lg{width:48px;height:48px;font-size:1em}.zl-av-xl{width:64px;height:64px;font-size:1.25em}.zl-avatar-status{position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;border:2px solid var(--bg-base,#0b0d0f)}.zl-st-online{background:var(--accent-green,#5ee29a)}.zl-st-offline{background:var(--text-tertiary,#5c6270)}.zl-st-busy{background:var(--accent-red,#f28b82)}.zl-st-away{background:var(--accent-amber,#fab95b)}
.zl-icon{vertical-align:middle;font-style:normal;font-variation-settings:"FILL" 1,"wght" 400,"GRAD" 0,"opsz" 24;display:inline-block;line-height:1;user-select:none}.zl-icon-primary{color:var(--primary,#5b9dfa)}.zl-icon-success{color:var(--accent-green,#5ee29a)}.zl-icon-warning{color:var(--accent-amber,#fab95b)}.zl-icon-danger{color:var(--accent-red,#f28b82)}.zl-icon-muted{color:var(--text-tertiary,#5c6270)}.zl-icon-wrap{display:inline-flex;align-items:center;gap:.3em;vertical-align:middle}.zl-icon-label{font-size:.875em;color:var(--text-secondary,#9ca3af)}
@media(max-width:640px){.zl-card-group,.zl-cg-2,.zl-cg-3,.zl-cg-4{grid-template-columns:1fr!important}.zl-columns{flex-direction:column}}
`.trim();

// ─── CSS injection helper ─────────────────────────────────────────────────────

/** Check whether any Phase 3 directive nodes exist in the node tree. */
export function hasP3Directives(nodes) {
  if (!nodes?.length) return false;
  for (const n of nodes) {
    if (!n) continue;
    if (PHASE3_NODE_TYPES.has(n.type)) return true;
    if (hasP3Directives(n.children)) return true;
    if (hasP3Directives(n.tabs))     return true;
    if (hasP3Directives(n.items))    return true;
    if (hasP3Directives(n.head))     return true;
    if (hasP3Directives(n.rows))     return true;
  }
  return false;
}

// ─── Unique ID generator ──────────────────────────────────────────────────────

let _uid = 0;
function uid() { return `zl${++_uid}`; }

// ─── Main dispatch ────────────────────────────────────────────────────────────

/**
 * @param {ASTNode} node
 * @param {RenderContext} ctx
 * @param {{ renderBlock(n,ctx):string, renderInline(nodes,ctx):string }} helpers
 * @returns {string}
 */
export function renderDirective(node, ctx, helpers) {
  switch (node.type) {
    case 'embed':          return _embed(node, ctx, helpers);
    case 'collapse':       return _collapse(node, ctx, helpers);
    case 'tabs':           return _tabs(node, ctx, helpers);
    case 'card':           return _card(node, ctx, helpers);
    case 'card_group':     return _cardGroup(node, ctx, helpers);
    case 'steps':          return _steps(node, ctx, helpers);
    case 'columns':        return _columns(node, ctx, helpers);
    case 'badge':          return _badge(node, ctx, helpers);
    case 'tag':            return _tag(node, ctx, helpers);
    case 'alert':          return _alert(node, ctx, helpers);
    case 'timeline':       return _timeline(node, ctx, helpers);
    case 'progress':       return _progress(node, ctx, helpers);
    case 'avatar':         return _avatar(node, ctx, helpers);
    case 'icon':           return _icon(node, ctx, helpers);
    default:               return '';
  }
}

// ─── Embed ────────────────────────────────────────────────────────────────────

const EMBED_ICONS = { youtube:'smart_display', vimeo:'play_circle', figma:'design_services', codepen:'code', codesandbox:'code_blocks', iframe:'open_in_new', image:'image', video:'videocam', audio:'volume_up' };

function _embed(n, ctx, h) {
  const t    = n.embedType;
  const cap  = n.caption ? `\n<figcaption class="zl-embed-cap">${escapeHtml(n.caption)}</figcaption>` : '';
  const lazy = n.lazy ? ' loading="lazy"' : '';
  const title = n.title ? ` title="${escapeAttr(n.title)}"` : '';
  const src  = n.src ? escapeAttr(n.src) : '';
  let inner  = '';

  if (t === 'image') {
    const alt = escapeAttr(n.alt ?? '');
    const w   = n.width  ? ` width="${escapeAttr(n.width)}"` : '';
    const hh  = n.height ? ` height="${escapeAttr(n.height)}"` : '';
    inner = `<img class="zl-embed-img" src="${src}" alt="${alt}"${title}${w}${hh}${lazy}>`;
  } else if (t === 'audio') {
    inner = `<audio controls src="${src}"${title}${lazy}><p>Audio not supported.</p></audio>`;
  } else if (t === 'video') {
    const w = n.width ? ` width="${escapeAttr(n.width)}"` : '';
    const hh = n.height ? ` height="${escapeAttr(n.height)}"` : '';
    inner = `<div class="zl-embed-ratio"><video controls src="${src}"${title}${w}${hh}${lazy}><p>Video not supported.</p></video></div>`;
  } else if (t === 'youtube') {
    const vid = extractYouTubeId(src);
    const url = vid ? `https://www.youtube-nocookie.com/embed/${vid}` : src;
    inner = `<div class="zl-embed-ratio"><iframe src="${url}"${title} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen${lazy}></iframe></div>`;
  } else if (t === 'vimeo') {
    const vid = src.match(/vimeo\.com\/(\d+)/)?.[1] ?? '';
    const url = vid ? `https://player.vimeo.com/video/${vid}` : src;
    inner = `<div class="zl-embed-ratio"><iframe src="${url}"${title} allow="autoplay;fullscreen;picture-in-picture" allowfullscreen${lazy}></iframe></div>`;
  } else {
    // figma, codepen, codesandbox, iframe — generic ratio box
    const w = n.width  ? `style="padding-bottom:${n.height ?? '56.25%'}"` : '';
    inner = `<div class="zl-embed-ratio"${w}><iframe src="${src}"${title}${lazy}></iframe></div>`;
  }

  return `<figure class="zl-embed zl-embed-${escapeAttr(t)}">${inner}${cap}\n</figure>`;
}

function extractYouTubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m?.[1] ?? null;
}

// ─── Collapse ─────────────────────────────────────────────────────────────────

function _collapse(n, ctx, h) {
  const open  = n.open ? ' open' : '';
  const inner = n.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
  return `<details class="zl-collapse"${open}>\n<summary class="zl-collapse-summary">${escapeHtml(n.title)}</summary>\n<div class="zl-collapse-body">${inner}</div>\n</details>`;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TAB_FN = `(function(b){var t=b.closest('.zl-tabs');t.querySelectorAll('.zl-tab-btn').forEach(function(x){x.setAttribute('aria-selected','false')});t.querySelectorAll('.zl-tab-panel').forEach(function(p){p.hidden=true});b.setAttribute('aria-selected','true');document.getElementById(b.dataset.panel).hidden=false})(this)`;

function _tabs(n, ctx, h) {
  const id   = uid();
  const tabs = n.tabs ?? [];
  const active = Math.min(n.active ?? 0, tabs.length - 1);

  const btnHtml = tabs.map((tab, i) => {
    const sel     = i === active ? '"true"' : '"false"';
    const panelId = `${id}-p${i}`;
    const icon    = tab.icon ? `<span class="material-symbols-rounded zl-icon" style="font-size:1em">${escapeHtml(tab.icon)}</span> ` : '';
    return `<button class="zl-tab-btn" role="tab" aria-selected=${sel} aria-controls="${escapeAttr(panelId)}" data-panel="${escapeAttr(panelId)}" onclick="${escapeAttr(TAB_FN)}">${icon}${escapeHtml(tab.label)}</button>`;
  }).join('\n');

  const panelHtml = tabs.map((tab, i) => {
    const panelId = `${id}-p${i}`;
    const hidden  = i !== active ? ' hidden' : '';
    const inner   = tab.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
    return `<div class="zl-tab-panel" id="${escapeAttr(panelId)}" role="tabpanel"${hidden}>${inner}</div>`;
  }).join('\n');

  return `<div class="zl-tabs">\n<div class="zl-tab-list" role="tablist">${btnHtml}</div>\n<div class="zl-tab-panels">${panelHtml}</div>\n</div>`;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function _card(n, ctx, h) {
  const varCls = n.variant !== 'default' ? ` zl-card-${escapeAttr(n.variant)}` : '';
  const inner  = [];
  if (n.img) inner.push(`<img class="zl-card-img" src="${escapeAttr(n.img)}" alt="${escapeAttr(n.title ?? '')}" loading="lazy">`);
  const hdr = [];
  if (n.icon) hdr.push(`<span class="material-symbols-rounded zl-card-icon">${escapeHtml(n.icon)}</span>`);
  if (n.title) hdr.push(`<span class="zl-card-title">${escapeHtml(n.title)}</span>`);
  if (hdr.length) inner.push(`<div class="zl-card-hdr">${hdr.join('')}</div>`);
  if (n.description) inner.push(`<p class="zl-card-desc">${escapeHtml(n.description)}</p>`);
  const body = n.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
  if (body) inner.push(body);
  const content = `<div class="zl-card${varCls}">${inner.join('\n')}</div>`;
  if (n.href) return `<a class="zl-card${varCls}" href="${escapeAttr(n.href)}" style="text-decoration:none;display:block">${inner.join('\n')}</a>`;
  return content;
}

function _cardGroup(n, ctx, h) {
  const cols = Math.min(Math.max(Number(n.cols ?? 3), 1), 4);
  const cards = n.children.map(c => _card(c, ctx, h)).join('\n');
  return `<div class="zl-card-group zl-cg-${cols}">${cards}</div>`;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function _steps(n, ctx, h) {
  const items = n.children.map((step, i) => {
    const icon = step.icon
      ? `<span class="material-symbols-rounded" style="font-size:1em">${escapeHtml(step.icon)}</span>`
      : String(i + 1);
    const body = step.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
    return `<li class="zl-step"><div class="zl-step-marker">${icon}</div><div class="zl-step-content"><div class="zl-step-title">${escapeHtml(step.title)}</div>${body ? `<div class="zl-step-body">${body}</div>` : ''}</div></li>`;
  }).join('\n');
  return `<ol class="zl-steps" style="counter-reset:zl-step">${items}</ol>`;
}

// ─── Columns ──────────────────────────────────────────────────────────────────

function _columns(n, ctx, h) {
  const gap  = n.gap ? ` style="gap:${escapeAttr(n.gap)}"` : '';
  const cols = n.children.map(col => {
    const w    = col.width ? ` style="flex:0 0 ${escapeAttr(col.width)};min-width:0"` : '';
    const body = col.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
    return `<div class="zl-column"${w}>${body}</div>`;
  }).join('\n');
  return `<div class="zl-columns"${gap}>${cols}</div>`;
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function _badge(n, ctx, h) {
  const v   = escapeAttr(n.variant);
  const cls = ['zl-badge', `zl-badge-${v}`, ...(n.pill ? ['zl-badge-pill'] : []), ...(n.outline ? ['zl-badge-outline'] : [])].join(' ');
  const icon = n.icon ? `<span class="material-symbols-rounded" style="font-size:1em;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">${escapeHtml(n.icon)}</span>` : '';
  return `<span class="${cls}">${icon}${escapeHtml(n.value)}</span>`;
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

function _tag(n, ctx, h) {
  const col  = n.color ? ` style="color:${escapeAttr(n.color)};border-color:${escapeAttr(n.color)}"` : '';
  const icon = n.icon  ? `<span class="material-symbols-rounded" style="font-size:.9em">${escapeHtml(n.icon)}</span>` : '';
  const inner = `${icon}${escapeHtml(n.value)}`;
  if (n.href) return `<a class="zl-tag" href="${escapeAttr(n.href)}"${col}>${inner}</a>`;
  return `<span class="zl-tag"${col}>${inner}</span>`;
}

// ─── Alert ────────────────────────────────────────────────────────────────────

const ALERT_ICONS = { info:'info', success:'check_circle', warning:'warning', danger:'error', note:'sticky_note_2', primary:'info' };

function _alert(n, ctx, h) {
  const t      = escapeAttr(n.alertType);
  const iName  = n.icon || ALERT_ICONS[n.alertType] || 'info';
  const icon   = `<span class="material-symbols-rounded zl-alert-icon">${escapeHtml(iName)}</span>`;
  const dismiss = n.dismissible ? `<button class="zl-alert-close" onclick="this.closest('.zl-alert').remove()" aria-label="Dismiss">✕</button>` : '';
  const title  = n.title ? `<div class="zl-alert-title">${escapeHtml(n.title)}</div>` : '';
  const body   = n.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
  return `<div class="zl-alert zl-alert-${t}" role="alert">${icon}<div class="zl-alert-body">${title}${body}</div>${dismiss}</div>`;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function _timeline(n, ctx, h) {
  const events = n.children.map(ev => {
    const date  = ev.date  ? `<time class="zl-event-date">${escapeHtml(ev.date)}</time>` : '';
    const title = `<div class="zl-event-title">${escapeHtml(ev.title)}</div>`;
    const body  = ev.children.map(c => h.renderBlock(c, ctx)).filter(Boolean).join('\n');
    return `<div class="zl-event">${date}${title}${body ? `<div class="zl-event-body">${body}</div>` : ''}</div>`;
  }).join('\n');
  return `<div class="zl-timeline">${events}</div>`;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function _progress(n, ctx, h) {
  const pct   = Math.min(100, Math.max(0, Math.round((n.value / n.max) * 100)));
  const hdr   = (n.label || n.showPercent) ? `<div class="zl-progress-hdr">${n.label ? `<span class="zl-progress-label">${escapeHtml(n.label)}</span>` : ''}${n.showPercent ? `<span class="zl-progress-pct">${pct}%</span>` : ''}</div>` : '';
  const bar   = `<div class="zl-progress-bar zl-pb-${escapeAttr(n.color)}" style="width:${pct}%" role="progressbar" aria-valuenow="${n.value}" aria-valuemax="${n.max}" aria-valuemin="0"></div>`;
  return `<div class="zl-progress">${hdr}<div class="zl-progress-track">${bar}</div></div>`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function _avatar(n, ctx, h) {
  const size   = escapeAttr(n.size || 'md');
  const status = n.status ? `<span class="zl-avatar-status zl-st-${escapeAttr(n.status)}"></span>` : '';
  let inner = '';
  if (n.src) {
    inner = `<img src="${escapeAttr(n.src)}" alt="${escapeAttr(n.alt ?? '')}" loading="lazy">`;
  } else if (n.initials) {
    inner = `<span class="zl-avatar-initials">${escapeHtml(n.initials.slice(0, 2).toUpperCase())}</span>`;
  } else {
    const iconName = n.icon || 'person';
    inner = `<span class="material-symbols-rounded" style="font-size:60%;font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 20">${escapeHtml(iconName)}</span>`;
  }
  return `<div class="zl-avatar zl-av-${size}">${inner}${status}</div>`;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

function _icon(n, ctx, h) {
  const sz    = n.size  ? ` style="font-size:${Number(n.size)}px"` : '';
  const col   = n.color ? ` zl-icon-${escapeAttr(n.color)}` : '';
  const aria  = n.label ? ` aria-label="${escapeAttr(n.label)}"` : ` aria-hidden="true"`;
  const span  = `<span class="material-symbols-rounded zl-icon${col}"${sz}${aria}>${escapeHtml(n.name)}</span>`;
  if (n.label) return `<span class="zl-icon-wrap">${span}<span class="zl-icon-label">${escapeHtml(n.label)}</span></span>`;
  return span;
}
