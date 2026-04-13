import { ensureStyle } from "./style";
import { makeThemeManager } from "./theme";
import { initContainer } from "./flex";

const REGISTRY_KEY = "__LIA_DYNFLEX_V1_0__";
const DOC_KEY_ATTR = "data-dynflex-doc";

(function () {
  // ── Window context ──────────────────────────────────────────────────────────
  function getRootWindow(): Window {
    let w: Window = window;
    try { while (w.parent && w.parent !== w) w = w.parent; } catch (_) {}
    return w;
  }

  const rootWin  = getRootWindow();
  const rootDoc  = rootWin.document;
  const contentDoc = document;

  // ── Run-once guard ──────────────────────────────────────────────────────────
  (rootWin as any)[REGISTRY_KEY] = (rootWin as any)[REGISTRY_KEY] || { docs: {} };

  let docKey = contentDoc.documentElement.getAttribute(DOC_KEY_ATTR);
  if (!docKey) {
    docKey = (contentDoc.baseURI || "dynflex") + "::" + Math.random().toString(36).slice(2);
    contentDoc.documentElement.setAttribute(DOC_KEY_ATTR, docKey);
  }
  if ((rootWin as any)[REGISTRY_KEY].docs[docKey]) return;
  (rootWin as any)[REGISTRY_KEY].docs[docKey] = true;

  // ── Style + theme ───────────────────────────────────────────────────────────
  ensureStyle(rootDoc);
  ensureStyle(contentDoc);

  const theme = makeThemeManager(rootDoc, contentDoc);
  theme.update(true);
  theme.observe(rootWin);

  // ── Scan ────────────────────────────────────────────────────────────────────
  const initialized = new WeakSet<Element>();

  function scanDoc(doc: Document): void {
    try {
      doc.querySelectorAll(".dynFlex").forEach(el => {
        if (!initialized.has(el)) {
          initialized.add(el);
          initContainer(el, doc);
        }
      });
    } catch (_) {}
  }

  function scan(): void {
    theme.update(false);
    scanDoc(rootDoc);
    scanDoc(contentDoc);
  }

  // Initial scans (staggered for late-rendering content)
  scan();
  [30, 120, 320, 900].forEach(ms => setTimeout(scan, ms));

  // ── DOM observer ────────────────────────────────────────────────────────────
  let scheduled = false;
  function scheduleScan(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  }

  const mo = new MutationObserver(muts => {
    if (muts.some(m => m.addedNodes.length)) scheduleScan();
  });
  try { mo.observe(contentDoc.documentElement, { childList: true, subtree: true }); } catch (_) {}
  try { mo.observe(rootDoc.documentElement,    { childList: true, subtree: true }); } catch (_) {}
})();
