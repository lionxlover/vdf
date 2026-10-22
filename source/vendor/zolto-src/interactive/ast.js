/**
 * Zolto Interactive Document AST — Phase 10
 *
 * Monomorphic AST node factories for forms, inputs, quizzes, flashcards,
 * polls, task lists, tabs, accordions, state, and bindings.
 *
 * Contract:
 *   - All fields are present on every node (no missing keys)
 *   - Missing optional values use null, not undefined
 *   - Collections use arrays, never null
 */

export const INTERACTIVE_NODE_TYPES = Object.freeze({
  INTERACTIVE:     'interactive',
  FORM:            'form',
  INPUT:           'input',
  TEXTAREA:        'textarea',
  BUTTON:          'button',
  CHECKBOX:        'checkbox',
  RADIO_GROUP:     'radio_group',
  RADIO_OPTION:    'radio_option',
  SELECT:          'select',
  SELECT_OPTION:   'select_option',
  SLIDER:          'slider',
  TOGGLE:          'toggle',
  SEGMENT:         'segment',
  SEGMENT_ITEM:    'segment_item',
  PROGRESS:        'progress',
  QUIZ:            'quiz',
  MCQ:             'mcq',
  MCQ_OPTION:      'mcq_option',
  MULTI_CHOICE:    'multi_choice',
  TRUE_FALSE:      'true_false',
  FILL_BLANK:      'fill_blank',
  MATCHING:        'matching',
  MATCH_PAIR:      'match_pair',
  MATRIX:          'matrix',
  HINT:            'hint',
  EXPLAIN:         'explain',
  TIMER:           'timer',
  FLASHCARD_DECK:  'flashcard_deck',
  FLASHCARD:       'flashcard',
  POLL:            'poll',
  POLL_OPTION:     'poll_option',
  TASK_LIST:       'task_list',
  TASK_ITEM:       'task_item',
  ACCORDION:       'accordion',
  ACCORDION_SECTION:'accordion_section',
  TABS_INTERACTIVE:'tabs_interactive',
  TAB_INTERACTIVE: 'tab_interactive',
  STATE_BLOCK:     'state_block',
  STATE_VAR:       'state_var',
  SHARED_BLOCK:    'shared_block',
  BINDING:         'binding',
});

// ─── Container nodes ──────────────────────────────────────────────────────────

export function createInteractiveNode(children = [], meta = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.INTERACTIVE,
    id:       meta.id || null,
    classes:  meta.classes || [],
    children: children || [],
  };
}

// ─── Form nodes ───────────────────────────────────────────────────────────────

export function createFormNode(name, children = [], meta = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.FORM,
    name:     String(name || ''),
    action:   meta.action || null,
    method:   meta.method || 'post',
    id:       meta.id || null,
    children: children || [],
  };
}

export function createInputNode(inputType, name, opts = {}) {
  return {
    type:        INTERACTIVE_NODE_TYPES.INPUT,
    inputType:   String(inputType || 'text'),
    name:        String(name || ''),
    label:       opts.label || null,
    placeholder: opts.placeholder || null,
    value:       opts.value !== undefined ? opts.value : null,
    required:    Boolean(opts.required),
    disabled:    Boolean(opts.disabled),
    readonly:    Boolean(opts.readonly),
    min:         opts.min !== undefined ? opts.min : null,
    max:         opts.max !== undefined ? opts.max : null,
    step:        opts.step !== undefined ? opts.step : null,
    minLength:   opts.minLength !== undefined ? opts.minLength : null,
    maxLength:   opts.maxLength !== undefined ? opts.maxLength : null,
    pattern:     opts.pattern || null,
    help:        opts.help || null,
    error:       opts.error || null,
    ariaLabel:   opts.ariaLabel || null,
    description: opts.description || null,
  };
}

export function createTextareaNode(name, opts = {}) {
  return {
    type:        INTERACTIVE_NODE_TYPES.TEXTAREA,
    name:        String(name || ''),
    label:       opts.label || null,
    placeholder: opts.placeholder || null,
    value:       opts.value || null,
    required:    Boolean(opts.required),
    disabled:    Boolean(opts.disabled),
    rows:        opts.rows !== undefined ? Number(opts.rows) : 4,
    cols:        opts.cols !== undefined ? Number(opts.cols) : null,
    help:        opts.help || null,
    error:       opts.error || null,
    ariaLabel:   opts.ariaLabel || null,
  };
}

export function createButtonNode(variant, name, label, opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.BUTTON,
    variant:  String(variant || 'primary'),
    name:     String(name || ''),
    label:    String(label || name || ''),
    btnType:  opts.btnType || 'button',
    disabled: Boolean(opts.disabled),
    loading:  Boolean(opts.loading),
    icon:     opts.icon || null,
    ariaLabel:opts.ariaLabel || null,
  };
}

export function createCheckboxNode(name, opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.CHECKBOX,
    name:     String(name || ''),
    label:    opts.label || null,
    checked:  Boolean(opts.checked),
    required: Boolean(opts.required),
    disabled: Boolean(opts.disabled),
    help:     opts.help || null,
    error:    opts.error || null,
    ariaLabel:opts.ariaLabel || null,
  };
}

export function createRadioGroupNode(name, options = [], opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.RADIO_GROUP,
    name:     String(name || ''),
    label:    opts.label || null,
    required: Boolean(opts.required),
    disabled: Boolean(opts.disabled),
    value:    opts.value || null,
    options:  options || [],
    help:     opts.help || null,
    error:    opts.error || null,
  };
}

export function createRadioOptionNode(value, label) {
  return {
    type:  INTERACTIVE_NODE_TYPES.RADIO_OPTION,
    value: String(value || ''),
    label: String(label || value || ''),
  };
}

export function createSelectNode(name, options = [], opts = {}) {
  return {
    type:       INTERACTIVE_NODE_TYPES.SELECT,
    name:       String(name || ''),
    label:      opts.label || null,
    required:   Boolean(opts.required),
    disabled:   Boolean(opts.disabled),
    multi:      Boolean(opts.multi),
    searchable: Boolean(opts.searchable),
    placeholder:opts.placeholder || null,
    value:      opts.value || null,
    options:    options || [],
    help:       opts.help || null,
    error:      opts.error || null,
    ariaLabel:  opts.ariaLabel || null,
  };
}

export function createSelectOptionNode(value, label) {
  return {
    type:  INTERACTIVE_NODE_TYPES.SELECT_OPTION,
    value: String(value || ''),
    label: String(label || value || ''),
  };
}

export function createSliderNode(name, opts = {}) {
  return {
    type:    INTERACTIVE_NODE_TYPES.SLIDER,
    name:    String(name || ''),
    label:   opts.label || null,
    min:     opts.min !== undefined ? Number(opts.min) : 0,
    max:     opts.max !== undefined ? Number(opts.max) : 100,
    step:    opts.step !== undefined ? Number(opts.step) : 1,
    value:   opts.value !== undefined ? Number(opts.value) : null,
    disabled:Boolean(opts.disabled),
    showValue:opts.showValue !== false,
    help:    opts.help || null,
    ariaLabel:opts.ariaLabel || null,
  };
}

export function createToggleNode(name, opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.TOGGLE,
    subtype:  opts.subtype || 'toggle',   // 'toggle' | 'switch'
    name:     String(name || ''),
    label:    opts.label || null,
    checked:  Boolean(opts.checked),
    disabled: Boolean(opts.disabled),
    ariaLabel:opts.ariaLabel || null,
  };
}

export function createSegmentNode(name, items = [], opts = {}) {
  return {
    type:  INTERACTIVE_NODE_TYPES.SEGMENT,
    name:  String(name || ''),
    label: opts.label || null,
    value: opts.value || null,
    items: items || [],
  };
}

export function createSegmentItemNode(value) {
  return {
    type:  INTERACTIVE_NODE_TYPES.SEGMENT_ITEM,
    value: String(value || ''),
    label: String(value || ''),
  };
}

export function createProgressNode(name, value, opts = {}) {
  return {
    type:   INTERACTIVE_NODE_TYPES.PROGRESS,
    name:   String(name || ''),
    value:  parseFloat(value) || 0,
    max:    opts.max !== undefined ? Number(opts.max) : 100,
    label:  opts.label || null,
    showPct:opts.showPct !== false,
  };
}

// ─── Quiz nodes ───────────────────────────────────────────────────────────────

export function createQuizNode(title, questions = [], opts = {}) {
  return {
    type:      INTERACTIVE_NODE_TYPES.QUIZ,
    title:     String(title || ''),
    questions: questions || [],
    timed:     opts.timed || null,       // null or seconds
    shuffle:   Boolean(opts.shuffle),
    showScore: opts.showScore !== false,
  };
}

export function createMCQNode(question, options = [], opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.MCQ,
    question: String(question || ''),
    options:  options || [],
    multi:    Boolean(opts.multi),
    hint:     opts.hint || null,
    explain:  opts.explain || null,
    shuffle:  Boolean(opts.shuffle),
  };
}

export function createMCQOptionNode(text, correct, opts = {}) {
  return {
    type:    INTERACTIVE_NODE_TYPES.MCQ_OPTION,
    text:    String(text || ''),
    correct: Boolean(correct),
    explain: opts.explain || null,
  };
}

export function createTrueFalseNode(question, answer, opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.TRUE_FALSE,
    question: String(question || ''),
    answer:   Boolean(answer),
    hint:     opts.hint || null,
    explain:  opts.explain || null,
  };
}

export function createFillBlankNode(question, answer, opts = {}) {
  return {
    type:       INTERACTIVE_NODE_TYPES.FILL_BLANK,
    question:   String(question || ''),
    answer:     String(answer || ''),
    caseSensitive: Boolean(opts.caseSensitive),
    hint:       opts.hint || null,
    explain:    opts.explain || null,
  };
}

export function createMatchingNode(question, pairs = [], opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.MATCHING,
    question: String(question || ''),
    pairs:    pairs || [],
    hint:     opts.hint || null,
  };
}

export function createMatchPairNode(left, right) {
  return {
    type:  INTERACTIVE_NODE_TYPES.MATCH_PAIR,
    left:  String(left || ''),
    right: String(right || ''),
  };
}

export function createMatrixNode(question, rows = [], cols = [], cells = []) {
  return {
    type:     INTERACTIVE_NODE_TYPES.MATRIX,
    question: String(question || ''),
    rows:     rows || [],
    cols:     cols || [],
    cells:    cells || [],
  };
}

export function createHintNode(text) {
  return {
    type: INTERACTIVE_NODE_TYPES.HINT,
    text: String(text || ''),
  };
}

export function createExplainNode(text) {
  return {
    type: INTERACTIVE_NODE_TYPES.EXPLAIN,
    text: String(text || ''),
  };
}

export function createTimerNode(duration, opts = {}) {
  // duration: e.g. '15m', '60s', 90 (seconds)
  return {
    type:     INTERACTIVE_NODE_TYPES.TIMER,
    duration: parseDuration(duration),
    label:    opts.label || null,
    autoStart:Boolean(opts.autoStart),
  };
}

function parseDuration(raw) {
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim();
  const mMatch = s.match(/^(\d+)m$/i);
  if (mMatch) return Number(mMatch[1]) * 60;
  const secMatch = s.match(/^(\d+)s$/i);
  if (secMatch) return Number(secMatch[1]);
  const num = parseInt(s, 10);
  return isNaN(num) ? 0 : num;
}

// ─── Flashcard nodes ──────────────────────────────────────────────────────────

export function createFlashcardDeckNode(name, cards = [], opts = {}) {
  return {
    type:       INTERACTIVE_NODE_TYPES.FLASHCARD_DECK,
    name:       String(name || ''),
    cards:      cards || [],
    shuffle:    Boolean(opts.shuffle),
    difficulty: opts.difficulty || null,
    tags:       opts.tags || [],
  };
}

export function createFlashcardNode(front, back, opts = {}) {
  return {
    type:       INTERACTIVE_NODE_TYPES.FLASHCARD,
    front:      String(front || ''),
    back:       String(back || ''),
    difficulty: opts.difficulty || null,
    tags:       opts.tags || [],
  };
}

// ─── Poll nodes ───────────────────────────────────────────────────────────────

export function createPollNode(question, options = [], opts = {}) {
  return {
    type:      INTERACTIVE_NODE_TYPES.POLL,
    question:  String(question || ''),
    options:   options || [],
    multi:     Boolean(opts.multi),
    anonymous: Boolean(opts.anonymous),
    showResults: opts.showResults !== false,
  };
}

export function createPollOptionNode(text) {
  return {
    type:  INTERACTIVE_NODE_TYPES.POLL_OPTION,
    text:  String(text || ''),
    votes: 0,
  };
}

// ─── Task list nodes ──────────────────────────────────────────────────────────

export function createTaskListNode(items = [], opts = {}) {
  return {
    type:  INTERACTIVE_NODE_TYPES.TASK_LIST,
    items: items || [],
    label: opts.label || null,
  };
}

export function createTaskItemNode(text, checked, children = []) {
  return {
    type:     INTERACTIVE_NODE_TYPES.TASK_ITEM,
    text:     String(text || ''),
    checked:  Boolean(checked),
    children: children || [],
  };
}

// ─── Navigation / layout interactive nodes ────────────────────────────────────

export function createInteractiveTabsNode(tabs = [], opts = {}) {
  return {
    type:   INTERACTIVE_NODE_TYPES.TABS_INTERACTIVE,
    tabs:   tabs || [],
    active: opts.active || 0,
  };
}

export function createInteractiveTabNode(label, children = []) {
  return {
    type:     INTERACTIVE_NODE_TYPES.TAB_INTERACTIVE,
    label:    String(label || ''),
    children: children || [],
  };
}

export function createAccordionNode(sections = []) {
  return {
    type:     INTERACTIVE_NODE_TYPES.ACCORDION,
    sections: sections || [],
  };
}

export function createAccordionSectionNode(title, children = [], opts = {}) {
  return {
    type:     INTERACTIVE_NODE_TYPES.ACCORDION_SECTION,
    title:    String(title || ''),
    open:     Boolean(opts.open),
    children: children || [],
  };
}

// ─── State / binding nodes ────────────────────────────────────────────────────

export function createStateBlockNode(vars = [], opts = {}) {
  return {
    type:  INTERACTIVE_NODE_TYPES.STATE_BLOCK,
    scope: opts.scope || 'local',   // 'local' | 'shared'
    vars:  vars || [],
  };
}

export function createStateVarNode(name, value, varType) {
  return {
    type:    INTERACTIVE_NODE_TYPES.STATE_VAR,
    name:    String(name || ''),
    value:   value !== undefined ? value : null,
    varType: varType || inferType(value),
  };
}

export function createBindingNode(expr, context) {
  return {
    type:    INTERACTIVE_NODE_TYPES.BINDING,
    expr:    String(expr || ''),
    context: context || null,
  };
}

function inferType(value) {
  if (value === null || value === undefined) return 'any';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isInteractiveNode(node) {
  return Boolean(
    node &&
    typeof node === 'object' &&
    Object.values(INTERACTIVE_NODE_TYPES).includes(node.type)
  );
}
