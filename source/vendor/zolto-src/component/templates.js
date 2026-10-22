/**
 * Zolto Template System & Template Inheritance — Phase 9
 *
 * Manages document templates, template inheritance (`extends`),
 * composition, and slot filling across document layouts.
 */

import { createTemplateDefNode } from './ast.js';

export function resolveTemplateInheritance(templateDef, registry) {
  if (!templateDef || !templateDef.extendsName) {
    return templateDef;
  }

  const parentDef = registry.getTemplate(templateDef.extendsName);
  if (!parentDef) {
    return templateDef;
  }

  // Recursively resolve parent inheritance
  const resolvedParent = resolveTemplateInheritance(parentDef, registry);

  // Merge parent props and child props
  const propMap = new Map();
  for (const p of resolvedParent.props || []) propMap.set(p.name, p);
  for (const p of templateDef.props || []) propMap.set(p.name, p);

  // Merge slots
  const slotMap = new Map();
  for (const s of resolvedParent.slots || []) slotMap.set(s.name, s);
  for (const s of templateDef.slots || []) slotMap.set(s.name, s);

  // Combine bodies
  const combinedBody = [...(resolvedParent.body || []), ...(templateDef.body || [])];

  return createTemplateDefNode(
    templateDef.name,
    null,
    Array.from(propMap.values()),
    Array.from(slotMap.values()),
    combinedBody
  );
}
