import { saveWidths, loadWidths } from "./storage";

interface ContainerConfig {
  gap: string;
  hit: string;
  basis: number;
  min: number;
  max: number;
  store?: string;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

function parsePct(x: string | null, fallback: number): number {
  if (!x) return fallback;
  const n = Number(x.trim().replace("%", ""));
  return Number.isFinite(n) ? n : fallback;
}

function ensurePx(v: string): string {
  const t = v.trim();
  return t.endsWith("px") ? t : t + "px";
}

// ── Blockify ──────────────────────────────────────────────────────────────────

function blockifyFlexChild(fc: HTMLElement, doc: Document): void {
  if (fc.dataset.dynflexBlockified === "1") return;
  if (fc.querySelector("input, textarea, select, button, .lia-btn, .lia-quiz")) {
    fc.dataset.dynflexBlockified = "1";
    return;
  }

  const parts = (fc.innerHTML || "")
    .split(/\n[ \t]*\n+/)
    .filter(p => p.replace(/\s+/g, "").length > 0);

  if (parts.length > 1 && fc.innerHTML.includes("[[")) {
    fc.innerHTML = "";
    for (const part of parts) {
      const d = doc.createElement("div");
      d.setAttribute("data-dynflex-block", "1");
      d.innerHTML = part;
      fc.appendChild(d);
    }
  }

  fc.dataset.dynflexBlockified = "1";
}

function blockifyAll(container: Element, doc: Document): void {
  try {
    container.querySelectorAll(".flex-child").forEach(fc => {
      if (fc.closest(".dynFlex") === container) blockifyFlexChild(fc as HTMLElement, doc);
    });
  } catch (_) {}
}

// ── Resizer ───────────────────────────────────────────────────────────────────

function bindResizer(
  rz: HTMLElement,
  container: Element,
  item: HTMLElement,
  cfg: ContainerConfig,
  onSave: () => void
): void {
  if (rz.dataset.bound === "1") return;
  rz.dataset.bound = "1";

  let dragging = false, startX = 0, startW = 0;

  const getW = (): number => {
    const w = item.style.getPropertyValue("--w").trim();
    if (w.endsWith("%")) { const n = parseFloat(w); if (Number.isFinite(n)) return n; }
    const cw = container.getBoundingClientRect().width || 1;
    return (item.getBoundingClientRect().width / cw) * 100;
  };

  const onDown = (e: PointerEvent) => {
    dragging = true;
    container.classList.add("dynFlexDragging");
    startX = e.clientX; startW = getW();
    rz.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const cw = container.getBoundingClientRect().width || 1;
    const newW = clamp(startW + (e.clientX - startX) / cw * 100, cfg.min, cfg.max);
    item.style.setProperty("--w", newW.toFixed(2) + "%");
    onSave();
    e.preventDefault();
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    container.classList.remove("dynFlexDragging");
    try { rz.releasePointerCapture?.(e.pointerId); } catch (_) {}
    e.preventDefault();
  };

  rz.addEventListener("pointerdown", onDown);
  rz.addEventListener("pointermove", onMove);
  rz.addEventListener("pointerup", onUp);
  rz.addEventListener("pointercancel", onUp);
}

// ── Container init ────────────────────────────────────────────────────────────

function directChildOf(container: Element, node: Element): HTMLElement | null {
  let it: Element | null = node;
  while (it && it.parentElement !== container) it = it.parentElement;
  return (it && it.parentElement === container) ? it as HTMLElement : null;
}

function getDirectItems(container: Element): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  container.querySelectorAll(".flex-child").forEach(fc => {
    if (fc.closest(".dynFlex") !== container) return;
    const it = directChildOf(container, fc);
    if (it) seen.add(it);
  });
  return [...seen];
}

export function initContainer(container: Element, doc: Document): void {
  const el = container as HTMLElement;
  const cfg: ContainerConfig = {
    gap:   el.getAttribute("data-gap")   ? ensurePx(el.getAttribute("data-gap")!)   : "20px",
    hit:   el.getAttribute("data-hit")   ? ensurePx(el.getAttribute("data-hit")!)   : "22px",
    basis: parsePct(el.getAttribute("data-basis"), 25),
    min:   parsePct(el.getAttribute("data-min"),   10),
    max:   parsePct(el.getAttribute("data-max"),   100),
    store: el.getAttribute("data-store") || undefined,
  };

  el.style.setProperty("--dyn-gap",   cfg.gap);
  el.style.setProperty("--dyn-hit",   cfg.hit);
  el.style.setProperty("--dyn-basis", cfg.basis + "%");

  blockifyAll(container, doc);

  const items = getDirectItems(container);
  if (!items.length) return;

  items.forEach(it => it.classList.add("dynFlexItem"));

  // Restore stored widths
  if (cfg.store) {
    const anySet = items.some(it => it.style.getPropertyValue("--w").trim());
    if (!anySet) {
      const stored = loadWidths(cfg.store);
      if (stored && stored.length === items.length) {
        items.forEach((it, i) => {
          const w = (stored[i] || "").trim();
          if (w.endsWith("%")) it.style.setProperty("--w", w);
        });
      }
    }
  }

  const persist = () => {
    if (cfg.store) saveWidths(cfg.store, items.map(it => it.style.getPropertyValue("--w").trim() || ""));
  };

  items.forEach((item, i) => {
    let rz = item.querySelector<HTMLElement>(":scope > .dynFlexResizer");
    if (!rz) {
      rz = document.createElement("div");
      rz.className = "dynFlexResizer";
      rz.setAttribute("aria-hidden", "true");
      item.appendChild(rz);
    }
    if (i === items.length - 1) rz.classList.add("dynFlexResizerEnd");
    else rz.classList.remove("dynFlexResizerEnd");
    bindResizer(rz, container, item, cfg, persist);
  });
}
