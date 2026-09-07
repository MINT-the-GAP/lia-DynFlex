import { ensureStyle } from "./style";
import { makeThemeManager } from "./theme";
import { initContainer } from "./flex";

const REGISTRY_KEY = "__LIA_DYNFLEX_V1_0__";
const DOC_KEY_ATTR = "data-dynflex-doc";

/** Tracks which content documents already have DynFlex running under a host. */
interface DynFlexRegistry {
  docs: Record<string, boolean>;
}

/** The plugin script may be evaluated more than once; the registry is shared. */
type RegistryHost = Window & { [REGISTRY_KEY]?: DynFlexRegistry };

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
  const host = rootWin as RegistryHost;
  const registry: DynFlexRegistry = host[REGISTRY_KEY] || { docs: {} };
  host[REGISTRY_KEY] = registry;

  const existingKey = contentDoc.documentElement.getAttribute(DOC_KEY_ATTR);
  const docKey =
    existingKey ||
    (contentDoc.baseURI || "dynflex") + "::" + Math.random().toString(36).slice(2);
  if (!existingKey) {
    contentDoc.documentElement.setAttribute(DOC_KEY_ATTR, docKey);
  }
  if (registry.docs[docKey]) return;
  registry.docs[docKey] = true;

  // ── Teardown ────────────────────────────────────────────────────────────────
  // Everything that outlives a single slide hangs off this signal, so unloading
  // the content document releases the observers and listeners in one abort()
  // instead of leaving them attached to a document that is no longer rendered.
  const teardown = new AbortController();
  const { signal } = teardown;

  // ── Style + theme ───────────────────────────────────────────────────────────
  ensureStyle(rootDoc);
  ensureStyle(contentDoc);

  const theme = makeThemeManager(rootDoc, contentDoc);
  theme.update(true);
  theme.observe(rootWin, signal);

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
  const timers = [30, 120, 320, 900].map(ms => setTimeout(scan, ms));
  signal.addEventListener(
    "abort",
    () => timers.forEach(t => clearTimeout(t)),
    { once: true }
  );

  // ── DOM observer ────────────────────────────────────────────────────────────
  let scheduled = false;
  function scheduleScan(): void {
    if (scheduled || signal.aborted) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (!signal.aborted) scan();
    });
  }

  const mo = new MutationObserver(muts => {
    if (muts.some(m => m.addedNodes.length)) scheduleScan();
  });
  try { mo.observe(contentDoc.documentElement, { childList: true, subtree: true }); } catch (_) {}
  try { mo.observe(rootDoc.documentElement,    { childList: true, subtree: true }); } catch (_) {}
  signal.addEventListener("abort", () => mo.disconnect(), { once: true });

  // When the content document goes away, release everything and drop the
  // registry entry so a fresh document under the same host can initialize.
  rootWin.addEventListener(
    "pagehide",
    () => {
      delete registry.docs[docKey];
      teardown.abort();
    },
    { once: true }
  );
})();
