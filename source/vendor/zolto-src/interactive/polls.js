/**
 * Zolto Interactive Poll Engine — Phase 10
 *
 * Pure functions for poll result computation.
 */

/**
 * Tally votes for a poll and compute percentages.
 * @param {object} pollNode   Poll AST node
 * @param {number[]} votes    Array of selected option indices (0-based)
 * @returns {{ options: {text, votes, pct}[], totalVotes: number }}
 */
export function tally(pollNode, votes = []) {
  if (!pollNode || !Array.isArray(pollNode.options)) {
    return { options: [], totalVotes: 0 };
  }

  const counts = new Array(pollNode.options.length).fill(0);
  for (const v of votes) {
    if (typeof v === 'number' && v >= 0 && v < counts.length) {
      counts[v]++;
    }
  }

  const totalVotes = counts.reduce((s, c) => s + c, 0);

  const options = pollNode.options.map((opt, i) => ({
    text:  opt.text,
    votes: counts[i],
    pct:   totalVotes === 0 ? 0 : Math.round((counts[i] / totalVotes) * 100),
  }));

  return { options, totalVotes };
}

/**
 * Validate a poll has minimum requirements.
 * @param {object} pollNode
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validatePoll(pollNode) {
  const issues = [];
  if (!pollNode?.question?.trim()) issues.push('Poll is missing a question');
  if (!Array.isArray(pollNode?.options) || pollNode.options.length < 2) {
    issues.push('Poll must have at least 2 options');
  }
  return { valid: issues.length === 0, issues };
}
