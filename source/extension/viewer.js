/* VDF Viewer — parses .vdf (Vacter Document File) entirely in the browser.
 *
 * File layout: 64-byte "%VDF-1.0" header + standard ZIP payload + 64-byte
 * "VDFT" trailer. The ZIP is read manually (local headers, central directory,
 * EOCD) and inflated with the native DecompressionStream('deflate-raw') —
 * zero dependencies, works in every modern browser (Chrome 80+, Edge, Brave,
 * Firefox 113+, Opera, Vivaldi).
 */
(function () {
  'use strict';

  // ─── helpers ────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const td = new TextDecoder();

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function humanBytes(n) {
    if (n < 1024) return n + ' B';
    const u = ['KB', 'MB', 'GB'];
    let v = n, i = -1;
    while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
    return v.toFixed(1) + ' ' + u[i];
  }

  function mimeFor(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    return {
      svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp',
      woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4',
      webm: 'video/webm', json: 'application/json', css: 'text/css', txt: 'text/plain',
    }[ext] || 'application/octet-stream';
  }

  async function inflateRaw(u8) {
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([u8]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // ─── VDF / ZIP parser ───────────────────────────────────────────────────
  async function parseVdf(buffer) {
    const u8 = new Uint8Array(buffer);
    const dv = new DataView(buffer);
    const len = u8.length;
    const TL = 64; // VDF trailer size

    // 1. header + trailer (tolerant: a plain ZIP also opens)
    let info = { trailer: null, headerOk: false };
    if (len > 160) {
      info.headerOk = td.decode(u8.subarray(0, 9)) === '%VDF-1.0\n';
      const t = u8.slice(len - TL);
      const tdv = new DataView(t.buffer, t.byteOffset, t.byteLength);
      if (String.fromCharCode(t[0], t[1], t[2], t[3]) === 'VDFT') {
        info.trailer = {
          version: tdv.getUint16(4, true),
          flags: tdv.getUint16(6, true),
          zipOffset: Number(tdv.getBigUint64(8, true)),
          zipSize: Number(tdv.getBigUint64(16, true)),
          docCrc: tdv.getUint32(24, true),
          manifestCrc: tdv.getUint32(28, true),
        };
      }
    }
    const zipOffset = info.trailer ? info.trailer.zipOffset : 0;

    // 2. locate End-Of-Central-Directory (scan backwards, tolerate our trailer)
    let eocd = -1;
    const searchFloor = Math.max(zipOffset, len - 66000 - TL);
    for (let i = len - 22 - TL; i >= searchFloor; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('No ZIP end-of-central-directory record — this is not a VDF or ZIP file.');
    const count = dv.getUint16(eocd + 10, true);
    let cdOffset = dv.getUint32(eocd + 16, true);
    const cdSize = dv.getUint32(eocd + 12, true);

    // VDF writers store absolute offsets; tolerate relative too
    if (cdOffset !== 0 && cdOffset + cdSize !== eocd) {
      const abs = cdOffset + zipOffset;
      if (abs + cdSize === eocd) cdOffset = abs;
    }

    // 3. walk the central directory
    const entries = [];
    let p = cdOffset;
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Corrupt ZIP central directory (entry ' + i + ').');
      const method = dv.getUint16(p + 10, true);
      const crc = dv.getUint32(p + 16, true);
      const compSize = dv.getUint32(p + 20, true);
      const size = dv.getUint32(p + 24, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const localOff = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nameLen));
      entries.push({ name, method, crc, compSize, size, localOff });
      p += 46 + nameLen + extraLen + commentLen;
    }

    // 4. read + inflate + CRC-check every entry
    const files = new Map();
    const warnings = [];
    for (const e of entries) {
      if (e.name.endsWith('/')) continue;
      if (e.localOff < zipOffset && info.trailer) { // relative offsets in cd
        e.localOff += zipOffset;
      }
      if (dv.getUint32(e.localOff, true) !== 0x04034b50) {
        throw new Error('Corrupt local header for "' + e.name + '".');
      }
      const nameLen = dv.getUint16(e.localOff + 26, true);
      const extraLen = dv.getUint16(e.localOff + 28, true);
      const dataStart = e.localOff + 30 + nameLen + extraLen;
      const raw = u8.subarray(dataStart, dataStart + e.compSize);
      let bytes;
      if (e.method === 0) bytes = raw;
      else if (e.method === 8) bytes = await inflateRaw(raw);
      else { warnings.push('"' + e.name + '" uses unsupported compression method ' + e.method + ' — skipped.'); continue; }
      if (crc32(bytes) !== (e.crc >>> 0)) {
        throw new Error('CRC-32 mismatch for "' + e.name + '" — the file is corrupt or truncated.');
      }
      files.set(e.name, bytes);
    }
    info.files = files;
    info.warnings = warnings;
    return info;
  }

  // ─── rendering ──────────────────────────────────────────────────────────
  function renderDoc(parsed, fileName) {
    const files = parsed.files;
    if (!files.has('manifest.json')) throw new Error('manifest.json missing — not a valid VDF document.');
    const manifest = JSON.parse(td.decode(files.get('manifest.json')));

    // mime check (advisory)
    if (files.has('mimetype') && td.decode(files.get('mimetype')) !== 'application/vnd.vacter.vdf') {
      parsed.warnings.push('Unexpected mimetype entry.');
    }

    const entry = manifest.entry || 'document.zl';
    if (!files.has(entry)) throw new Error('Entry document "' + entry + '" missing from the archive.');
    const docSrc = td.decode(files.get(entry));

    // blob URLs for assets
    const assetUrls = new Map();
    for (const [name, bytes] of files) {
      if (name.startsWith('assets/') && !name.endsWith('/')) {
        assetUrls.set(name, URL.createObjectURL(new Blob([bytes], { type: mimeFor(name) })));
      }
    }

    // fonts → @font-face with blob sources
    let fontStack = '';
    const fontFaces = [];
    let n = 0;
    for (const [name, url] of assetUrls) {
      if (!/^assets\/fonts\//.test(name)) continue;
      const m = /\.(woff2|woff|ttf|otf)$/i.exec(name);
      if (!m) continue;
      n += 1;
      const fam = 'VdfFont' + n;
      const fmt = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }[m[1].toLowerCase()];
      const weight = /bold/i.test(name) ? 'bold' : 'normal';
      fontFaces.push("@font-face{font-family:'" + fam + "';src:url(" + JSON.stringify(url) + ") format('" + fmt + "');font-weight:" + weight + ';font-display:swap}');
      fontStack += (fontStack ? ',' : '') + "'" + fam + "'";
    }
    if (fontStack) {
      const st = document.createElement('style');
      st.textContent = fontFaces.join('\n') + "\nmain.doc{font-family:" + fontStack + ",ui-sans-serif,system-ui,'Segoe UI',Roboto,Arial,sans-serif}";
      document.head.appendChild(st);
    }

    // compile with Zolto
    if (!window.Zolto) throw new Error('Zolto engine failed to load.');
    const out = window.Zolto.parse(docSrc);
    const html = window.Zolto.compile(docSrc);

    const docEl = $('vdf-doc');
    docEl.innerHTML = html;

    // rewrite asset references → blob URLs
    if (assetUrls.size) {
      docEl.querySelectorAll('[src]').forEach((el) => {
        const v = el.getAttribute('src');
        if (v && assetUrls.has(v)) el.src = assetUrls.get(v);
      });
      docEl.querySelectorAll('[href]').forEach((el) => {
        const v = el.getAttribute('href');
        if (v && assetUrls.has(v)) el.href = assetUrls.get(v);
      });
    }

    // interactive runtime (quizzes, tabs, …)
    try { window.Zolto.initZoltoInteractivity(document); } catch (e) { console.warn(e); }

    // header metadata
    const title = manifest.title || fileName.replace(/\.vdf$/i, '') || 'VDF document';
    document.title = title + ' — VDF Viewer';
    $('doc-title').textContent = title;
    let raw = 0;
    for (const [, bytes] of files) raw += bytes.length;
    $('doc-meta').textContent =
      (manifest.author ? manifest.author + ' · ' : '') +
      files.size + ' entries · ' + humanBytes(raw) +
      (manifest.engine ? ' · Zolto ' + (manifest.engine.version || '') : '');

    // surface engine diagnostics softly
    if (out.errors && out.errors.length) {
      parsed.warnings.push('Zolto reported ' + out.errors.length + ' parse error(s) — check the browser console.');
      console.warn('Zolto errors:', out.errors);
    }
    if (parsed.warnings.length) {
      const box = document.createElement('pre');
      box.style.cssText = 'white-space:pre-wrap;background:#fff8e6;color:#7a5b00;border-radius:8px;padding:12px 14px;font-size:12.5px;margin:0 0 20px';
      box.textContent = parsed.warnings.join('\n');
      docEl.prepend(box);
    }
  }

  // ─── UI wiring ──────────────────────────────────────────────────────────
  const landing = $('landing');
  const app = $('app');
  const drop = $('drop');
  const fileInput = $('file');
  const errBox = $('err');

  function showError(msg) {
    errBox.hidden = false;
    errBox.textContent = msg;
  }

  async function openFile(file) {
    errBox.hidden = true;
    if (!file) return;
    try {
      const parsed = await parseVdf(await file.arrayBuffer());
      renderDoc(parsed, file.name);
      landing.hidden = true;
      app.hidden = false;
    } catch (e) {
      landing.hidden = false;
      app.hidden = true;
      showError(String((e && e.message) || e));
    }
  }

  $('pick').addEventListener('click', () => fileInput.click());
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => openFile(fileInput.files[0]));

  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => openFile(e.dataTransfer.files[0]));

  // allow dropping anywhere on the document view too
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files.length) {
      e.preventDefault();
      openFile(e.dataTransfer.files[0]);
    }
  });

  $('open-another').addEventListener('click', () => {
    app.hidden = true;
    landing.hidden = false;
    fileInput.value = '';
    $('vdf-doc').innerHTML = '';
  });

  // Node test hook (browsers never see this — `module` is undefined there)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseVdf, crc32, inflateRaw, mimeFor, humanBytes };
  }
})();
