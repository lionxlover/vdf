/**
 * Zolto Diagram Parser — Phase 5
 *
 * Dedicated parser for Zolto `@diagram` domain language, producing Diagram AST.
 */

import { parseAttrStr } from '../directive-lexer.js';
import {
  diagramNode, graphNode, diagramNodeItem, diagramEdgeNode,
  groupNode, clusterNode, referenceNode,
} from './ast.js';
import { DiagramDiagnostics } from './diagnostics.js';
import { tokenizeDiagram, TokenType } from './tokenizer.js';
import { validateDiagram } from './validator.js';

/**
 * Parses directive header line: e.g. "flowchart id=\"auth-flow\" theme=\"dark\" layout=\"hierarchical\""
 */
export function parseDiagramHeader(headerStr) {
  const trimmed = headerStr.trim();
  const spaceIdx = trimmed.search(/\s/);
  const typeStr = spaceIdx > 0 ? trimmed.slice(0, spaceIdx) : trimmed;
  const attrStr = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1) : '';

  const attrs = parseAttrStr(attrStr);
  return {
    diagramType: (typeStr || 'flowchart').toLowerCase(),
    id: attrs.id ?? null,
    theme: attrs.theme ?? 'light',
    layout: attrs.layout ?? 'hierarchical',
    aria: attrs.aria ?? null,
    title: attrs.title ?? attrs.label ?? null,
    attributes: attrs,
  };
}

/**
 * Main parse function for raw diagram body content.
 */
export function parseDiagram(bodyStr, headerStr = 'flowchart') {
  let cleanBody = bodyStr.trim();
  let effectiveHeader = headerStr;

  // If bodyStr starts with @diagram, extract header line and body content
  if (cleanBody.startsWith('@diagram')) {
    const firstNL = cleanBody.indexOf('\n');
    if (firstNL !== -1) {
      effectiveHeader = cleanBody.slice(8, firstNL).trim();
      cleanBody = cleanBody.slice(firstNL + 1);
    } else {
      effectiveHeader = cleanBody.slice(8).trim();
      cleanBody = '';
    }
  }

  // Strip trailing @/diagram if present
  cleanBody = cleanBody.replace(/\n?\s*@\/diagram\s*$/, '');

  const diagnostics = new DiagramDiagnostics();
  const header = parseDiagramHeader(effectiveHeader);

  const tokens = tokenizeDiagram(cleanBody);
  let pos = 0;

  const nodeMap = new Map();
  const edgeList = [];
  const groupList = [];
  const clusterList = [];
  const refList = [];

  function peek() { return tokens[pos] ?? { type: TokenType.EOF }; }
  function advance() { return tokens[pos++]; }

  function match(type) {
    if (peek().type === type) {
      return advance();
    }
    return null;
  }

  function getOrCreateNode(id, label = null, shape = 'rect', opts = {}) {
    if (nodeMap.has(id)) {
      const existing = nodeMap.get(id);
      if (label && existing.label === existing.id) existing.label = label;
      if (shape && shape !== 'rect') existing.shape = shape;
      if (opts.style) existing.style = opts.style;
      if (opts.fill) existing.fill = opts.fill;
      if (opts.stroke) existing.stroke = opts.stroke;
      if (opts.color) existing.color = opts.color;
      if (opts.radius !== undefined) existing.radius = opts.radius;
      if (opts.shadow !== undefined) existing.shadow = opts.shadow;
      if (opts.animate) existing.animate = opts.animate;
      Object.assign(existing.attributes, opts.attributes ?? {});
      return existing;
    }
    const newNode = diagramNodeItem(id, label ?? id, shape, opts);
    nodeMap.set(id, newNode);
    return newNode;
  }

  function parseAttributesInline() {
    if (!match(TokenType.LBRACKET)) return {};
    const attrs = {};
    while (pos < tokens.length && peek().type !== TokenType.RBRACKET && peek().type !== TokenType.EOF) {
      if (match(TokenType.COMMA)) continue;
      const keyTok = advance();
      if (!keyTok || keyTok.type === TokenType.NEWLINE || keyTok.type === TokenType.COMMA) continue;
      const key = String(keyTok.value);
      if (key === ',') continue;

      if (match(TokenType.EQUALS)) {
        const valTok = advance();
        attrs[key] = valTok ? valTok.value : true;
      } else {
        attrs[key] = true;
      }
    }
    match(TokenType.RBRACKET);
    return attrs;
  }

  // Parse lines
  while (pos < tokens.length && peek().type !== TokenType.EOF) {
    const tok = peek();

    if (tok.type === TokenType.NEWLINE || tok.type === TokenType.CLOSE_DIAGRAM) {
      advance();
      continue;
    }

    // `ref DB as database.main`
    if (tok.type === TokenType.REF_KW) {
      advance();
      const origTok = advance();
      if (match(TokenType.AS_KW)) {
        const aliasTok = advance();
        if (origTok && aliasTok) {
          refList.push(referenceNode(String(origTok.value), String(aliasTok.value)));
        }
      }
      continue;
    }

    // `node pay.start [label="Start", shape="circle"]`
    if (tok.type === TokenType.NODE_KW) {
      advance();
      const idTok = advance();
      if (idTok) {
        const nodeId = String(idTok.value);
        const attrs = parseAttributesInline();
        getOrCreateNode(nodeId, attrs.label ?? nodeId, attrs.shape ?? 'rect', {
          style: attrs.style,
          fill: attrs.fill,
          stroke: attrs.stroke,
          color: attrs.color,
          radius: attrs.radius,
          shadow: attrs.shadow,
          animate: attrs.animate,
          attributes: attrs,
        });
      }
      continue;
    }

    // `actor User` / `entity User` / `package Core` / `component Renderer`
    if ([TokenType.ACTOR_KW, TokenType.ENTITY_KW, TokenType.PACKAGE_KW, TokenType.COMPONENT_KW].includes(tok.type)) {
      const kwTok = advance();
      const nameTok = advance();
      if (nameTok) {
        const shapeName = kwTok.type === TokenType.ACTOR_KW ? 'actor' :
                          kwTok.type === TokenType.ENTITY_KW ? 'rectangle' :
                          kwTok.type === TokenType.PACKAGE_KW ? 'package' : 'component';
        getOrCreateNode(String(nameTok.value), String(nameTok.value), shapeName);
      }
      continue;
    }

    // `class User { ... }`
    if (tok.type === TokenType.CLASS_KW) {
      advance();
      const classNameTok = advance();
      const className = classNameTok ? String(classNameTok.value) : 'Class';
      const classNode = getOrCreateNode(className, className, 'rect');
      classNode.metadata.isClass = true;
      classNode.metadata.members = [];
      if (match(TokenType.LBRACE)) {
        while (pos < tokens.length && peek().type !== TokenType.RBRACE && peek().type !== TokenType.EOF) {
          const t = advance();
          if (t.type === TokenType.STRING || t.type === TokenType.IDENTIFIER) {
            classNode.metadata.members.push(String(t.value));
          }
        }
        match(TokenType.RBRACE);
      }
      continue;
    }

    // `object user1 : User { ... }`
    if (tok.type === TokenType.OBJECT_KW) {
      advance();
      const objNameTok = advance();
      const objName = objNameTok ? String(objNameTok.value) : 'Object';
      let typeName = '';
      if (match(TokenType.COLON)) {
        const typeTok = advance();
        if (typeTok) typeName = String(typeTok.value);
      }
      const labelStr = typeName ? `${objName} : ${typeName}` : objName;
      const objNode = getOrCreateNode(objName, labelStr, 'round-rect');
      objNode.metadata.isObject = true;
      objNode.metadata.props = {};
      if (match(TokenType.LBRACE)) {
        while (pos < tokens.length && peek().type !== TokenType.RBRACE && peek().type !== TokenType.EOF) {
          const keyTok = advance();
          if (keyTok && keyTok.type === TokenType.IDENTIFIER) {
            if (match(TokenType.EQUALS)) {
              const valTok = advance();
              if (valTok) objNode.metadata.props[String(keyTok.value)] = String(valTok.value);
            }
          }
        }
        match(TokenType.RBRACE);
      }
      continue;
    }

    // `group payment.group [label="Payment Stage"] ... @/group`
    if (tok.type === TokenType.GROUP_OPEN) {
      advance();
      const groupIdTok = advance();
      const groupId = groupIdTok ? String(groupIdTok.value) : `group_${groupList.length + 1}`;
      const attrs = parseAttributesInline();
      const nodeIds = [];
      while (pos < tokens.length && peek().type !== TokenType.GROUP_CLOSE && peek().type !== TokenType.EOF) {
        const childTok = advance();
        if (childTok.type === TokenType.IDENTIFIER || childTok.type === TokenType.STRING) {
          nodeIds.push(String(childTok.value));
          getOrCreateNode(String(childTok.value));
        }
      }
      match(TokenType.GROUP_CLOSE);
      groupList.push(groupNode(groupId, attrs.label ?? groupId, nodeIds, { attributes: attrs }));
      continue;
    }

    // `cluster backend.cluster [label="Backend"] ... @/cluster`
    if (tok.type === TokenType.CLUSTER_OPEN) {
      advance();
      const clusterIdTok = advance();
      const clusterId = clusterIdTok ? String(clusterIdTok.value) : `cluster_${clusterList.length + 1}`;
      const attrs = parseAttributesInline();
      const nodeIds = [];
      while (pos < tokens.length && peek().type !== TokenType.CLUSTER_CLOSE && peek().type !== TokenType.EOF) {
        const childTok = advance();
        if (childTok.type === TokenType.NODE_KW) {
          const idTok = advance();
          if (idTok) {
            const nodeId = String(idTok.value);
            const nAttrs = parseAttributesInline();
            getOrCreateNode(nodeId, nAttrs.label ?? nodeId, nAttrs.shape ?? 'rect');
            nodeIds.push(nodeId);
          }
        } else if (childTok.type === TokenType.IDENTIFIER || childTok.type === TokenType.STRING) {
          nodeIds.push(String(childTok.value));
          getOrCreateNode(String(childTok.value));
        }
      }
      match(TokenType.CLUSTER_CLOSE);
      clusterList.push(clusterNode(clusterId, attrs.label ?? clusterId, nodeIds, [], { attributes: attrs }));
      continue;
    }

    // `edge A -> B`
    if (tok.type === TokenType.EDGE_KW) {
      advance();
      const fromTok = advance();
      if (match(TokenType.ARROW)) {
        const toTok = advance();
        if (fromTok && toTok) {
          const fromId = String(fromTok.value);
          const toId = String(toTok.value);
          const attrs = parseAttributesInline();
          getOrCreateNode(fromId);
          getOrCreateNode(toId);
          edgeList.push(diagramEdgeNode(fromId, toId, attrs.label ?? null, {
            style: attrs.style,
            color: attrs.color,
            arrow: attrs.arrow,
            animate: attrs.animate,
            value: attrs.value,
            attributes: attrs,
          }));
        }
      }
      continue;
    }

    // Shorthand line statements: `A -> B [attrs]`, `User -> App: Message`, `TaskA [start=..., end=...]`
    const sourceTok = advance();
    if (!sourceTok || (sourceTok.type !== TokenType.IDENTIFIER && sourceTok.type !== TokenType.STRING)) {
      continue;
    }

    const sourceId = String(sourceTok.value);

    // Single node declaration with inline brackets `TaskA [start="...", end="..."]`
    if (peek().type === TokenType.LBRACKET) {
      const attrs = parseAttributesInline();
      getOrCreateNode(sourceId, attrs.label ?? sourceId, attrs.shape ?? 'rect', {
        style: attrs.style,
        fill: attrs.fill,
        stroke: attrs.stroke,
        color: attrs.color,
        radius: attrs.radius,
        shadow: attrs.shadow,
        animate: attrs.animate,
        attributes: attrs,
      });
      continue;
    }

    // Arrow edge statement `A -> B` or `A --> B`
    if (peek().type === TokenType.ARROW) {
      const arrowTok = advance();
      const targetTok = advance();
      if (targetTok) {
        const targetId = String(targetTok.value);
        let labelStr = null;

        // Message label via colon `User -> App: Enter credentials`
        if (match(TokenType.COLON)) {
          const msgToks = [];
          while (pos < tokens.length && peek().type !== TokenType.NEWLINE && peek().type !== TokenType.LBRACKET && peek().type !== TokenType.EOF) {
            msgToks.push(advance().value);
          }
          labelStr = msgToks.join(' ');
        }

        const attrs = parseAttributesInline();
        if (attrs.label) labelStr = attrs.label;

        getOrCreateNode(sourceId);
        getOrCreateNode(targetId);
        edgeList.push(diagramEdgeNode(sourceId, targetId, labelStr, {
          arrow: attrs.arrow ?? (arrowTok.value.includes('--') ? 'dashed' : 'filled'),
          style: attrs.style ?? (arrowTok.value.includes('--') ? 'dashed' : 'solid'),
          color: attrs.color,
          value: attrs.value,
          animate: attrs.animate,
          cardinality: arrowTok.value.includes('{') || arrowTok.value.includes('}') ? arrowTok.value : null,
          attributes: attrs,
        }));
      }
      continue;
    }

    // Default standalone node registration
    getOrCreateNode(sourceId);
  }

  // Build Graph node
  const graph = graphNode(
    [...nodeMap.values()],
    {
      nodes: [...nodeMap.values()],
      edges: edgeList,
      groups: groupList,
      clusters: clusterList,
      references: refList,
    }
  );

  // Return root Diagram AST
  const ast = diagramNode(header.diagramType, [graph], {
    id: header.id,
    theme: header.theme,
    layout: header.layout,
    aria: header.aria,
    title: header.title,
    attributes: header.attributes,
  });

  const valDiag = validateDiagram(ast);
  diagnostics.merge(valDiag);

  return { ast, diagnostics };
}
