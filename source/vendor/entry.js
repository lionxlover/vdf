// Zolto engine — single-file bundle entry (IIFE, global `Zolto`)
// Bundled with esbuild for VDF: browsers block ES-module imports over file://,
// so VDF ships one classic script that works offline everywhere
// (CLI viewer HTML, browser extension, Android WebView).
import * as Zolto from './zolto-src/zolto.js';
import { initZoltoInteractivity } from './zolto-src/interactive/runtime.js';

const api = { ...Zolto, initZoltoInteractivity };
export default api;
globalThis.Zolto = api;
