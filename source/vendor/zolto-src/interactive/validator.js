/**
 * Zolto Interactive Validator — Phase 10
 *
 * Validates interactive AST nodes for accessibility, correctness,
 * and safety requirements. Returns an InteractiveDiagnostics instance.
 */

import { InteractiveDiagnostics } from './diagnostics.js';
import { isUnsafeExpr } from './state.js';

/**
 * Validate a tree of interactive nodes.
 * @param {object[]} nodes
 * @returns {InteractiveDiagnostics}
 */
export function validateInteractiveNodes(nodes) {
  const diag = new InteractiveDiagnostics();
  const fieldNames = new Set();

  for (const node of (nodes || [])) {
    validateNode(node, diag, fieldNames);
  }

  return diag;
}

function validateNode(node, diag, fieldNames) {
  if (!node || typeof node !== 'object') return;

  switch (node.type) {
    case 'form':
      validateChildren(node.children, diag, new Set()); // Each form has its own namespace
      break;

    case 'input':
    case 'textarea': {
      // Warn on missing label
      if (!node.label && !node.ariaLabel) {
        diag.warn('I001', `Input "${node.name}" has no label or aria-label. Screen readers need a label.`, { name: node.name });
      }
      // Duplicate field name detection
      if (node.name) {
        if (fieldNames.has(node.name)) {
          diag.error('I002', `Duplicate field name "${node.name}" in the same form.`, { name: node.name });
        } else {
          fieldNames.add(node.name);
        }
      }
      break;
    }

    case 'select': {
      if (!node.label && !node.ariaLabel) {
        diag.warn('I001', `Select "${node.name}" has no label. Add label to improve accessibility.`, { name: node.name });
      }
      if (!node.options || node.options.length === 0) {
        diag.warn('I003', `Select "${node.name}" has no options.`, { name: node.name });
      }
      if (fieldNames.has(node.name)) {
        diag.error('I002', `Duplicate field name "${node.name}".`, { name: node.name });
      } else {
        fieldNames.add(node.name);
      }
      break;
    }

    case 'radio_group': {
      if (!node.options || node.options.length === 0) {
        diag.warn('I003', `Radio group "${node.name}" has no options.`, { name: node.name });
      }
      break;
    }

    case 'slider': {
      if (node.min >= node.max) {
        diag.error('I004', `Slider "${node.name}" has min (${node.min}) >= max (${node.max}).`, { name: node.name });
      }
      break;
    }

    case 'quiz': {
      if (!node.questions || node.questions.length === 0) {
        diag.warn('I005', `Quiz "${node.title}" has no questions.`, { title: node.title });
      }
      for (const q of (node.questions || [])) validateNode(q, diag, fieldNames);
      break;
    }

    case 'mcq': {
      if (!node.options || node.options.length < 2) {
        diag.warn('I006', `MCQ "${node.question}" has fewer than 2 options.`, { question: node.question });
      }
      const hasCorrect = (node.options || []).some(o => o.correct);
      if (!hasCorrect) {
        diag.error('I007', `MCQ "${node.question}" has no correct answer marked.`, { question: node.question });
      }
      break;
    }

    case 'true_false': {
      if (node.answer === null || node.answer === undefined) {
        diag.error('I008', `True/false question "${node.question}" has no answer set.`, { question: node.question });
      }
      break;
    }

    case 'fill_blank': {
      if (!node.answer) {
        diag.error('I008', `Fill-blank question "${node.question}" has no answer set.`, { question: node.question });
      }
      break;
    }

    case 'matching': {
      if (!node.pairs || node.pairs.length === 0) {
        diag.warn('I009', `Matching question "${node.question}" has no pairs.`, { question: node.question });
      }
      break;
    }

    case 'flashcard_deck': {
      if (!node.cards || node.cards.length === 0) {
        diag.warn('I010', `Flashcard deck "${node.name}" has no cards.`, { name: node.name });
      }
      for (const card of (node.cards || [])) {
        if (!card.front || !card.back) {
          diag.warn('I011', `Flashcard in deck "${node.name}" is missing front or back.`, { name: node.name });
        }
      }
      break;
    }

    case 'poll': {
      if (!node.options || node.options.length < 2) {
        diag.warn('I012', `Poll "${node.question}" has fewer than 2 options.`, { question: node.question });
      }
      break;
    }

    case 'state_block': {
      for (const v of (node.vars || [])) {
        if (!v.name) {
          diag.error('I013', 'State variable is missing a name.', {});
        }
      }
      break;
    }

    case 'binding': {
      if (isUnsafeExpr(node.expr)) {
        diag.error('I014', `Binding expression "${node.expr}" is unsafe or invalid.`, { expr: node.expr });
      }
      break;
    }

    case 'interactive': {
      validateChildren(node.children, diag, fieldNames);
      break;
    }

    default:
      if (Array.isArray(node.children)) {
        validateChildren(node.children, diag, fieldNames);
      }
  }
}

function validateChildren(children, diag, fieldNames) {
  for (const child of (children || [])) {
    validateNode(child, diag, fieldNames);
  }
}
