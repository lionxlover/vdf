/**
 * Zolto Vector Graphics Grammar & Path Parser — Phase 7
 *
 * Parses vector tokens into a monomorphic Vector AST tree.
 */

import { VectorTokenType, tokenizeVector } from './tokenizer.js';
import { VectorDiagnostics, VectorDiagnosticCode } from './diagnostics.js';
import {
  createVectorNode, createSceneNode, createArtboardNode, createLayerNode,
  createGroupNode, createFrameNode, createSymbolNode, createUseNode,
  createShapeNode, createTextNode, createImageNode, createIconNode,
  createGradientNode, createPatternNode, createStyleNode, createMarkerNode,
} from './ast.js';

export function parseVector(sourceText, options = {}) {
  const diagnostics = new VectorDiagnostics();

  // Strip outer header tags if whole directive block was passed
  let cleanSrc = sourceText.trim();
  if (cleanSrc.startsWith('@vector')) {
    cleanSrc = cleanSrc.replace(/^@vector[^\n]*\n?/, '').replace(/@\/vector\s*$/, '').trim();
  }

  const tokens = tokenizeVector(cleanSrc);
  let pos = 0;

  function peek() {
    return tokens[pos] || { type: VectorTokenType.EOF };
  }

  function advance() {
    return tokens[pos++];
  }

  function match(type) {
    if (peek().type === type) {
      return advance();
    }
    return null;
  }

  function parseAttributesInline() {
    const attrs = {};
    while (pos < tokens.length) {
      const tok = peek();
      if (tok.type === VectorTokenType.NEWLINE || tok.type === VectorTokenType.EOF || tok.type === VectorTokenType.CLOSE_VECTOR) {
        break;
      }

      if (tok.type === VectorTokenType.IDENTIFIER || tok.type === VectorTokenType.STRING || tok.type === VectorTokenType.NUMBER) {
        const keyTok = advance();
        const key = String(keyTok.raw || keyTok.value);

        if (match(VectorTokenType.EQUALS)) {
          const valTok = advance();
          if (valTok) {
            attrs[key] = valTok.value;
          } else {
            attrs[key] = true;
          }
        } else {
          attrs[key] = true;
        }
      } else {
        advance();
      }
    }
    return attrs;
  }

  const rootChildren = [];

  while (pos < tokens.length && peek().type !== VectorTokenType.EOF) {
    const tok = peek();

    if (tok.type === VectorTokenType.NEWLINE || tok.type === VectorTokenType.CLOSE_VECTOR) {
      advance();
      continue;
    }

    if (tok.type === VectorTokenType.IDENTIFIER) {
      const keyword = String(tok.value).toLowerCase();

      // meta block / comments
      if (keyword === 'meta' || keyword === '#') {
        advance();
        while (pos < tokens.length && peek().type !== VectorTokenType.NEWLINE && peek().type !== VectorTokenType.EOF) {
          advance();
        }
        continue;
      }

      // artboard
      if (keyword === 'artboard') {
        advance();
        const attrs = parseAttributesInline();
        const artboardChildren = parseBlockChildren(['@endartboard', '@/artboard']);
        rootChildren.push(createArtboardNode(attrs, artboardChildren));
        continue;
      }

      // frame
      if (keyword === 'frame') {
        advance();
        const attrs = parseAttributesInline();
        const frameChildren = parseBlockChildren(['@endframe', '@/frame']);
        rootChildren.push(createFrameNode(attrs, frameChildren));
        continue;
      }

      // layer
      if (keyword === 'layer') {
        advance();
        const attrs = parseAttributesInline();
        const layerChildren = parseBlockChildren(['@endlayer', '@/layer']);
        rootChildren.push(createLayerNode(attrs.id || 'layer', layerChildren));
        continue;
      }

      // group
      if (keyword === 'group') {
        advance();
        const attrs = parseAttributesInline();
        const groupChildren = parseBlockChildren(['@endgroup', '@/group']);
        rootChildren.push(createGroupNode(attrs, groupChildren));
        continue;
      }

      // symbol
      if (keyword === 'symbol') {
        advance();
        const attrs = parseAttributesInline();
        const symbolChildren = parseBlockChildren(['@endsymbol', '@/symbol']);
        rootChildren.push(createSymbolNode(attrs.id || 'symbol', symbolChildren));
        continue;
      }

      // use
      if (keyword === 'use') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createUseNode(attrs));
        continue;
      }

      // rect
      if (keyword === 'rect') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('rect', attrs));
        continue;
      }

      // circle
      if (keyword === 'circle') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('circle', attrs));
        continue;
      }

      // ellipse
      if (keyword === 'ellipse') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('ellipse', attrs));
        continue;
      }

      // line
      if (keyword === 'line') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('line', attrs));
        continue;
      }

      // polyline
      if (keyword === 'polyline') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('polyline', attrs));
        continue;
      }

      // polygon
      if (keyword === 'polygon') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('polygon', attrs));
        continue;
      }

      // path (inline or block)
      if (keyword === 'path') {
        advance();
        const attrs = parseAttributesInline();
        if (attrs.d) {
          rootChildren.push(createShapeNode('path', attrs));
        } else {
          const pathCommands = parsePathBlock();
          attrs.d = pathCommands;
          rootChildren.push(createShapeNode('path', attrs));
        }
        continue;
      }

      // arc
      if (keyword === 'arc') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode('arc', attrs));
        continue;
      }

      // bezier
      if (keyword === 'bezier') {
        advance();
        const modeTok = advance();
        const mode = modeTok ? String(modeTok.value).toLowerCase() : 'quadratic';
        const attrs = parseAttributesInline();
        rootChildren.push(createShapeNode(mode === 'cubic' ? 'bezier-cubic' : 'bezier-quadratic', attrs));
        continue;
      }

      // text
      if (keyword === 'text') {
        advance();
        const attrs = parseAttributesInline();
        let textContent = '';
        while (pos < tokens.length) {
          const t = advance();
          if (t.type === VectorTokenType.IDENTIFIER && (t.value === '@endtext' || t.value === '@/text')) {
            break;
          }
          if (t.type === VectorTokenType.NEWLINE) textContent += '\n';
          else textContent += (t.value ?? t.raw ?? '') + ' ';
        }
        rootChildren.push(createTextNode(attrs, textContent.trim()));
        continue;
      }

      // image
      if (keyword === 'image') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createImageNode(attrs));
        continue;
      }

      // icon
      if (keyword === 'icon') {
        advance();
        const attrs = parseAttributesInline();
        rootChildren.push(createIconNode(attrs));
        continue;
      }

      // gradient
      if (keyword === 'gradient') {
        advance();
        const attrs = parseAttributesInline();
        const stops = [];
        while (pos < tokens.length && peek().type !== VectorTokenType.EOF) {
          const t = peek();
          if (t.type === VectorTokenType.IDENTIFIER && (t.value === '@endgradient' || t.value === '@/gradient')) {
            advance();
            break;
          }
          if (t.type === VectorTokenType.IDENTIFIER && t.value === 'stop') {
            advance();
            const stopAttrs = parseAttributesInline();
            stops.push(stopAttrs);
          } else {
            advance();
          }
        }
        rootChildren.push(createGradientNode(attrs.id || 'grad', attrs.type || 'linear', attrs, stops));
        continue;
      }

      // pattern
      if (keyword === 'pattern') {
        advance();
        const attrs = parseAttributesInline();
        const patternChildren = parseBlockChildren(['@endpattern', '@/pattern']);
        rootChildren.push(createPatternNode(attrs.id || 'pat', attrs, patternChildren));
        continue;
      }

      // style
      if (keyword === 'style') {
        advance();
        const attrs = parseAttributesInline();
        const props = {};
        while (pos < tokens.length && peek().type !== VectorTokenType.EOF) {
          const t = peek();
          if (t.type === VectorTokenType.IDENTIFIER && (t.value === '@endstyle' || t.value === '@/style')) {
            advance();
            break;
          }
          if (t.type === VectorTokenType.IDENTIFIER) {
            const propName = String(t.value);
            advance();
            if (match(VectorTokenType.EQUALS) || match(VectorTokenType.COLON)) {
              const valTok = advance();
              if (valTok) props[propName] = valTok.value;
            }
          } else {
            advance();
          }
        }
        rootChildren.push(createStyleNode(attrs.id || 'style', props));
        continue;
      }

      // marker
      if (keyword === 'marker') {
        advance();
        const attrs = parseAttributesInline();
        const markerChildren = parseBlockChildren(['@endmarker', '@/marker']);
        rootChildren.push(createMarkerNode(attrs.id || 'marker', attrs, markerChildren));
        continue;
      }

      // Fallback: advance unknown token
      advance();
    } else {
      advance();
    }
  }

  function parseBlockChildren(closingKeywords = []) {
    const children = [];
    while (pos < tokens.length && peek().type !== VectorTokenType.EOF) {
      const tok = peek();
      if (tok.type === VectorTokenType.IDENTIFIER && closingKeywords.includes(tok.value)) {
        advance();
        break;
      }
      if (tok.type === VectorTokenType.NEWLINE) {
        advance();
        continue;
      }

      if (tok.type === VectorTokenType.IDENTIFIER) {
        const kw = String(tok.value).toLowerCase();
        if (kw === 'group') {
          advance();
          const attrs = parseAttributesInline();
          const gChild = parseBlockChildren(['@endgroup', '@/group']);
          children.push(createGroupNode(attrs, gChild));
        } else if (kw === 'layer') {
          advance();
          const attrs = parseAttributesInline();
          const lChild = parseBlockChildren(['@endlayer', '@/layer']);
          children.push(createLayerNode(attrs.id || 'layer', lChild));
        } else if (kw === 'frame') {
          advance();
          const attrs = parseAttributesInline();
          const fChild = parseBlockChildren(['@endframe', '@/frame']);
          children.push(createFrameNode(attrs, fChild));
        } else if (kw === 'symbol') {
          advance();
          const attrs = parseAttributesInline();
          const sChild = parseBlockChildren(['@endsymbol', '@/symbol']);
          children.push(createSymbolNode(attrs.id || 'symbol', sChild));
        } else if (kw === 'use') {
          advance();
          children.push(createUseNode(parseAttributesInline()));
        } else if (kw === 'rect') {
          advance();
          children.push(createShapeNode('rect', parseAttributesInline()));
        } else if (kw === 'circle') {
          advance();
          children.push(createShapeNode('circle', parseAttributesInline()));
        } else if (kw === 'ellipse') {
          advance();
          children.push(createShapeNode('ellipse', parseAttributesInline()));
        } else if (kw === 'line') {
          advance();
          children.push(createShapeNode('line', parseAttributesInline()));
        } else if (kw === 'polyline') {
          advance();
          children.push(createShapeNode('polyline', parseAttributesInline()));
        } else if (kw === 'polygon') {
          advance();
          children.push(createShapeNode('polygon', parseAttributesInline()));
        } else if (kw === 'path') {
          advance();
          const attrs = parseAttributesInline();
          if (attrs.d) {
            children.push(createShapeNode('path', attrs));
          } else {
            const cmds = parsePathBlock();
            attrs.d = cmds;
            children.push(createShapeNode('path', attrs));
          }
        } else if (kw === 'image') {
          advance();
          children.push(createImageNode(parseAttributesInline()));
        } else if (kw === 'icon') {
          advance();
          children.push(createIconNode(parseAttributesInline()));
        } else if (kw === 'text') {
          advance();
          const attrs = parseAttributesInline();
          let txt = '';
          while (pos < tokens.length && peek().value !== '@endtext' && peek().value !== '@/text') {
            const t = advance();
            if (t.type === VectorTokenType.NEWLINE) txt += '\n';
            else txt += (t.value ?? t.raw ?? '') + ' ';
          }
          if (peek().value === '@endtext' || peek().value === '@/text') advance();
          children.push(createTextNode(attrs, txt.trim()));
        } else {
          advance();
        }
      } else {
        advance();
      }
    }
    return children;
  }

  function parsePathBlock() {
    const commands = [];
    while (pos < tokens.length && peek().type !== VectorTokenType.EOF) {
      const tok = peek();
      if (tok.type === VectorTokenType.IDENTIFIER && (tok.value === '@endpath' || tok.value === '@/path')) {
        advance();
        break;
      }
      if (tok.type === VectorTokenType.NEWLINE) {
        advance();
        continue;
      }

      if (tok.type === VectorTokenType.IDENTIFIER) {
        const cmd = String(tok.value).toLowerCase();
        advance();
        const args = [];
        while (pos < tokens.length && peek().type === VectorTokenType.NUMBER) {
          args.push(advance().value);
        }
        if (cmd === 'move') commands.push(`M ${args.join(' ')}`);
        else if (cmd === 'line') commands.push(`L ${args.join(' ')}`);
        else if (cmd === 'horizontal') commands.push(`H ${args.join(' ')}`);
        else if (cmd === 'vertical') commands.push(`V ${args.join(' ')}`);
        else if (cmd === 'quadratic') commands.push(`Q ${args.join(' ')}`);
        else if (cmd === 'cubic') commands.push(`C ${args.join(' ')}`);
        else if (cmd === 'arc') commands.push(`A ${args.join(' ')}`);
        else if (cmd === 'close') commands.push('Z');
      } else {
        advance();
      }
    }
    return commands.join(' ');
  }

  const ast = createVectorNode(options, rootChildren);
  return { ast, diagnostics };
}
