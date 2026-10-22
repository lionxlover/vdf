/**
 * Zolto Interactive Quiz Scoring Engine — Phase 10
 *
 * Pure deterministic scoring functions. No side effects, no I/O.
 * All functions take an AST node + answer and return a scored result object.
 */

// ─── Score result shape ───────────────────────────────────────────────────────

function scoreResult(earned, possible, details = {}) {
  return {
    earned:   earned,
    possible: possible,
    correct:  earned >= possible,
    pct:      possible === 0 ? 0 : Math.round((earned / possible) * 100),
    ...details,
  };
}

// ─── MCQ Scoring ──────────────────────────────────────────────────────────────

/**
 * Score a single-answer MCQ question.
 * @param {object} mcqNode   MCQ AST node
 * @param {string|number} answer  Index or text of selected option
 */
export function scoreMCQ(mcqNode, answer) {
  if (!mcqNode || !Array.isArray(mcqNode.options)) return scoreResult(0, 1);
  const options = mcqNode.options;
  let selectedIdx = -1;

  if (typeof answer === 'number') {
    selectedIdx = answer;
  } else if (typeof answer === 'string') {
    selectedIdx = options.findIndex(o => o.text === answer);
  }

  if (selectedIdx < 0 || selectedIdx >= options.length) return scoreResult(0, 1);
  const chosen = options[selectedIdx];
  return scoreResult(chosen.correct ? 1 : 0, 1, { selectedIdx, correctIdx: options.findIndex(o => o.correct) });
}

/**
 * Score a multi-select MCQ question (partial credit per correct selection).
 * @param {object} mcqNode   MCQ AST node
 * @param {number[]|string[]} answers  Array of selected indices or texts
 */
export function scoreMulti(mcqNode, answers) {
  if (!mcqNode || !Array.isArray(mcqNode.options)) return scoreResult(0, 1);
  const options = mcqNode.options;
  const correctSet = new Set(options.map((o, i) => o.correct ? i : -1).filter(i => i >= 0));
  const possible = correctSet.size || 1;

  const selectedIndices = new Set();
  for (const ans of (answers || [])) {
    if (typeof ans === 'number') selectedIndices.add(ans);
    else {
      const idx = options.findIndex(o => o.text === ans);
      if (idx >= 0) selectedIndices.add(idx);
    }
  }

  let earned = 0;
  for (const idx of selectedIndices) {
    if (correctSet.has(idx)) earned++;
    else earned--;                    // Penalty for wrong selections
  }
  earned = Math.max(0, earned);

  return scoreResult(earned, possible, { selectedIndices: [...selectedIndices] });
}

/**
 * Score a true/false question.
 * @param {object} tfNode   TrueFalse AST node
 * @param {boolean} answer  Selected answer
 */
export function scoreTrueFalse(tfNode, answer) {
  if (!tfNode) return scoreResult(0, 1);
  const correct = Boolean(tfNode.answer) === Boolean(answer);
  return scoreResult(correct ? 1 : 0, 1, { correctAnswer: tfNode.answer });
}

/**
 * Score a fill-in-the-blank question.
 * @param {object} blankNode  FillBlank AST node
 * @param {string} answer     User's typed answer
 */
export function scoreFillBlank(blankNode, answer) {
  if (!blankNode) return scoreResult(0, 1);
  const userAns = String(answer || '').trim();
  const correctAns = String(blankNode.answer || '').trim();

  let correct;
  if (blankNode.caseSensitive) {
    correct = userAns === correctAns;
  } else {
    correct = userAns.toLowerCase() === correctAns.toLowerCase();
  }
  return scoreResult(correct ? 1 : 0, 1, { correctAnswer: blankNode.answer });
}

/**
 * Score a matching question.
 * @param {object} matchNode   Matching AST node
 * @param {{ left:string, right:string }[]} pairs  User's matched pairs
 */
export function scoreMatching(matchNode, userPairs) {
  if (!matchNode || !Array.isArray(matchNode.pairs)) return scoreResult(0, 1);
  const correctPairs = matchNode.pairs;
  const possible = correctPairs.length;
  if (possible === 0) return scoreResult(0, 0);

  const correctMap = new Map(correctPairs.map(p => [p.left, p.right]));
  let earned = 0;
  for (const up of (userPairs || [])) {
    const expected = correctMap.get(up.left);
    if (expected !== undefined && expected === up.right) earned++;
  }
  return scoreResult(earned, possible);
}

// ─── Full Quiz Scoring ────────────────────────────────────────────────────────

/**
 * Score an entire quiz given an answer map.
 * @param {object} quizNode   Quiz AST node
 * @param {Map|object} answerMap   Map from question index → answer value
 * @returns {{ total: {earned, possible, pct}, questions: array }}
 */
export function quizScore(quizNode, answerMap) {
  if (!quizNode || !Array.isArray(quizNode.questions)) {
    return { total: scoreResult(0, 0), questions: [] };
  }

  const am = answerMap instanceof Map ? answerMap : new Map(Object.entries(answerMap || {}));
  const questionResults = [];

  for (let i = 0; i < quizNode.questions.length; i++) {
    const q = quizNode.questions[i];
    const answer = am.get(i) ?? am.get(String(i));
    let result;

    switch (q.type) {
      case 'mcq':
        result = q.multi ? scoreMulti(q, answer) : scoreMCQ(q, answer);
        break;
      case 'true_false':
        result = scoreTrueFalse(q, answer);
        break;
      case 'fill_blank':
        result = scoreFillBlank(q, answer);
        break;
      case 'matching':
        result = scoreMatching(q, answer);
        break;
      default:
        result = scoreResult(0, 1);
    }
    questionResults.push({ index: i, question: q, ...result });
  }

  const totalEarned   = questionResults.reduce((s, r) => s + r.earned, 0);
  const totalPossible = questionResults.reduce((s, r) => s + r.possible, 0);

  return {
    total: scoreResult(totalEarned, totalPossible),
    questions: questionResults,
  };
}
