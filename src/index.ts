import { ensureStyle } from "./style";
import { makeThemeManager } from "./theme";
import { initContainer } from "./flex";

const REGISTRY_KEY = "__LIA_DYNFLEX_V1_0__";
const DOC_KEY_ATTR = "data-dynflex-doc";

(function () {
  // ── Window context ──────────────────────────────────────────────────────────
  function isLiaScriptHost(win: Window): boolean {
    try {
      return !!win.document.querySelector(
        "#lia-toolbar-nav, header.lia-header, .lia-canvas"
      );
    } catch (_) {
      return false;
    }
  }

  function isLiveEditorPreview(win: Window): boolean {
    try {
      return (win.frameElement as HTMLElement | null)?.id === "liascript-preview";
    } catch (_) {
      return false;
    }
  }

  function getRootWindow(): Window {
    const contentWindow: Window = window;
    let candidate: Window = contentWindow;

    while (true) {
      // Nested courses and LiveEditor previews are complete LiaScript hosts.
      // Keep styles, observers, and the registry inside the nearest host
      // instead of leaking into a surrounding course or editor.
      if (isLiveEditorPreview(candidate) || isLiaScriptHost(candidate)) {
        return candidate;
      }

      try {
        const parent = candidate.parent;
        if (!parent || parent === candidate) return contentWindow;

        // Validate access before advancing. Otherwise a cross-origin LMS host
        // becomes the selected root and rootWin.document below throws before
        // DynFlex can inject styles or initialize any container.
        void parent.document;
        candidate = parent;
      } catch (_) {
        return contentWindow;
      }
    }
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
