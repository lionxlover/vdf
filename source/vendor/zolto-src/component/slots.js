/**
 * Zolto Slot & Slot Forwarding Engine — Phase 9
 *
 * Manages default and named slots, slot fallbacks, slot filling,
 * and slot forwarding between parent and child components.
 */

export function resolveSlots(slotDefs = [], slotOutlets = {}, children = []) {
  const resolved = {};

  // Build slot definitions map
  const defMap = new Map();
  for (const def of slotDefs) {
    const name = def.name || 'default';
    defMap.set(name, def);
  }

  // Handle explicit named slot outlets (e.g. fill header)
  for (const [name, body] of Object.entries(slotOutlets)) {
    resolved[name] = body;
  }

  // Handle default slot content from un-slotted children
  if (!resolved.default && children && children.length > 0) {
    resolved.default = children;
  }

  // Apply fallback content for empty slots
  for (const [name, def] of defMap.entries()) {
    if (!resolved[name] || (Array.isArray(resolved[name]) && resolved[name].length === 0)) {
      if (def.fallback && def.fallback.length > 0) {
        resolved[name] = def.fallback;
      } else {
        resolved[name] = [];
      }
    }
  }

  return resolved;
}

export function forwardSlots(parentSlots = {}, childSlotDefs = []) {
  const forwarded = {};
  for (const def of childSlotDefs) {
    const name = def.name || 'default';
    if (parentSlots[name] && parentSlots[name].length > 0) {
      forwarded[name] = parentSlots[name];
    }
  }
  return forwarded;
}
