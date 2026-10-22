/**
 * Zolto Component Registry — Phase 9
 *
 * Manages components, templates, and macros across built-in, global, document,
 * and imported scopes. Tracks component metadata and detects duplicate registrations.
 */

import { getBuiltinComponents } from './builtins.js';

export class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.templates  = new Map();
    this.macros     = new Map();
    this.imports    = new Set();

    // Register 12 built-in components by default
    const builtins = getBuiltinComponents();
    for (const [name, def] of builtins.entries()) {
      this.components.set(name, def);
    }
  }

  registerComponent(name, componentDef, diagnostics = null) {
    if (!name) return;
    if (this.components.has(name) && !this.isBuiltin(name)) {
      if (diagnostics) {
        diagnostics.warn('E905', `Duplicate component definition for "${name}"`, { name });
      }
    }
    this.components.set(name, componentDef);
  }

  getComponent(name) {
    return this.components.get(name) || null;
  }

  hasComponent(name) {
    return this.components.has(name);
  }

  registerTemplate(name, templateDef, diagnostics = null) {
    if (!name) return;
    if (this.templates.has(name)) {
      if (diagnostics) {
        diagnostics.warn('E905', `Duplicate template definition for "${name}"`, { name });
      }
    }
    this.templates.set(name, templateDef);
  }

  getTemplate(name) {
    return this.templates.get(name) || null;
  }

  hasTemplate(name) {
    return this.templates.has(name);
  }

  registerMacro(name, macroDef, diagnostics = null) {
    if (!name) return;
    if (this.macros.has(name)) {
      if (diagnostics) {
        diagnostics.warn('E905', `Duplicate macro definition for "${name}"`, { name });
      }
    }
    this.macros.set(name, macroDef);
  }

  getMacro(name) {
    return this.macros.get(name) || null;
  }

  hasMacro(name) {
    return this.macros.has(name);
  }

  isBuiltin(name) {
    const b = getBuiltinComponents();
    return b.has(name);
  }

  registerImport(importPath) {
    this.imports.add(importPath);
  }

  hasImport(importPath) {
    return this.imports.has(importPath);
  }
}

let globalRegistryInstance = null;

export function getGlobalRegistry() {
  if (!globalRegistryInstance) {
    globalRegistryInstance = new ComponentRegistry();
  }
  return globalRegistryInstance;
}
