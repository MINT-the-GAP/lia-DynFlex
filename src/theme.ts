const THEME_VARS = [
  "--lia-accent",
  "--lia-primary",
  "--lia-color-primary",
  "--primary",
  "--color-primary",
  "--accent-color",
];

const DEFAULT_ACCENT = "#0b5fff";

function pickAccent(doc: Document): string {
  try {
    const win = doc.defaultView || window;
    const cs = win.getComputedStyle(doc.documentElement);
    for (const v of THEME_VARS) {
      const val = cs.getPropertyValue(v).trim();
      if (val) return val;
    }
    const a = doc.querySelector("a");
    if (a) {
      const c = win.getComputedStyle(a).color;
      if (c && c !== "rgba(0, 0, 0, 0)") return c;
    }
    const b = doc.querySelector(".lia-btn");
    if (b) {
      const bg = win.getComputedStyle(b).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)") return bg;
    }
  } catch (_) {}
  return "";
}

function applyAccent(doc: Document, accent: string): void {
  try { doc.documentElement.style.setProperty("--dynflex-accent", accent); } catch (_) {}
}

export function makeThemeManager(rootDoc: Document, contentDoc: Document) {
  let lastAccent = "";

  function update(force = false): void {
    const acc = pickAccent(rootDoc) || pickAccent(contentDoc) || DEFAULT_ACCENT;
    if (force || acc !== lastAccent) {
      lastAccent = acc;
      applyAccent(rootDoc, acc);
      applyAccent(contentDoc, acc);
    }
  }

  // Watch for theme switches so the accent follows the host. Both the observer
  // and the media-query listener are tied to `signal` so a single abort() on
  // teardown releases everything.
  function observe(rootWin: Window, signal: AbortSignal): void {
    const mo = new MutationObserver(() => update());
    const cfg = { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-mode", "data-color-scheme"] };
    try { mo.observe(rootDoc.documentElement, cfg); } catch (_) {}
    try { mo.observe(contentDoc.documentElement, cfg); } catch (_) {}
    signal.addEventListener("abort", () => mo.disconnect(), { once: true });

    try {
      const mql = rootWin.matchMedia("(prefers-color-scheme: dark)");
      if (mql.addEventListener) {
        mql.addEventListener("change", () => update(true), { signal });
      }
    } catch (_) {}
  }

  return { update, observe };
}
