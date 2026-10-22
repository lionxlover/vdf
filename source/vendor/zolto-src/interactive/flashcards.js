/**
 * Zolto Interactive Flashcard Engine — Phase 10
 *
 * Pure functions for flashcard deck management: shuffle, progress,
 * difficulty grouping, and review cycle helpers.
 */

// ─── Shuffle ──────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle. Returns a new array; does not mutate input.
 * @param {Array} arr
 * @returns {Array}
 */
export function shuffleCards(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Compute deck completion progress.
 * @param {object} deckNode       FlashcardDeck AST node
 * @param {Set<number>} reviewedIndices  Set of card indices marked as reviewed
 * @returns {{ reviewed: number, total: number, pct: number }}
 */
export function deckProgress(deckNode, reviewedIndices = new Set()) {
  const total = Array.isArray(deckNode?.cards) ? deckNode.cards.length : 0;
  const reviewed = [...reviewedIndices].filter(i => i >= 0 && i < total).length;
  return {
    reviewed,
    total,
    pct: total === 0 ? 0 : Math.round((reviewed / total) * 100),
  };
}

// ─── Difficulty grouping ──────────────────────────────────────────────────────

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 };

/**
 * Group cards by difficulty level.
 * @param {object[]} cards  Array of flashcard AST nodes
 * @returns {{ easy: object[], medium: object[], hard: object[], none: object[] }}
 */
export function groupByDifficulty(cards) {
  const groups = { easy: [], medium: [], hard: [], none: [] };
  for (const card of (cards || [])) {
    const d = (card.difficulty || 'none').toLowerCase();
    if (groups[d]) groups[d].push(card);
    else groups.none.push(card);
  }
  return groups;
}

/**
 * Sort cards by difficulty (easy → hard).
 * @param {object[]} cards
 * @returns {object[]}
 */
export function sortByDifficulty(cards) {
  return [...(cards || [])].sort((a, b) => {
    const da = DIFFICULTY_ORDER[a.difficulty?.toLowerCase()] ?? 1;
    const db = DIFFICULTY_ORDER[b.difficulty?.toLowerCase()] ?? 1;
    return da - db;
  });
}

// ─── Tag filtering ────────────────────────────────────────────────────────────

/**
 * Filter cards matching any of the given tags.
 * @param {object[]} cards
 * @param {string[]} tags
 * @returns {object[]}
 */
export function filterByTags(cards, tags) {
  const tagSet = new Set((tags || []).map(t => t.toLowerCase()));
  return (cards || []).filter(card => {
    const cardTags = (card.tags || []).map(t => t.toLowerCase());
    return cardTags.some(t => tagSet.has(t));
  });
}

// ─── Review cycle ─────────────────────────────────────────────────────────────

/**
 * Get the next card index for review (skips already-reviewed if possible).
 * @param {number} currentIdx    Current card index
 * @param {number} total         Total number of cards
 * @param {Set<number>} reviewed Set of reviewed indices
 * @returns {number} Next card index
 */
export function nextCardIndex(currentIdx, total, reviewed) {
  if (total === 0) return 0;
  let idx = (currentIdx + 1) % total;
  // Try to find an unreviewed card first
  let attempts = 0;
  while (reviewed.has(idx) && attempts < total) {
    idx = (idx + 1) % total;
    attempts++;
  }
  return idx;
}
