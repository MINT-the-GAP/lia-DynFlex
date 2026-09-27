import { saveWidths, loadWidths } from "./storage";

interface ContainerConfig {
  gap: string;
  hit: string;
  basis: number;
  min: number;
  max: number;
  store?: string;
}

interface ContainerState {
  cfg: ContainerConfig;
  items: HTMLElement[];
  persist: () => void;
}

interface ResizerBinding {
  resizer: HTMLElement;
  container: HTMLElement;
  item: HTMLElement;
  state: ContainerState;
  interactions: DocumentInteractions;
}

interface ActiveDrag {
  binding: ResizerBinding;
  pointerId: number;
  startX: number;
  startW: number;
}

interface DocumentInteractions {
  doc: Document;
  bindings: Set<ResizerBinding>;
  active: ActiveDrag | null;
  hovered: ResizerBinding | null;
}

const containerStates = new WeakMap<HTMLElement, ContainerState>();
const resizerBindings = new WeakMap<HTMLElement, ResizerBinding>();
const documentInteractions = new WeakMap<Document, DocumentInteractions>();

const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "textarea",
  "select",
  "summary",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='switch']",
  "[role='textbox']",
  ".lia-btn",
  ".lia-quiz",
].join(",");

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

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as Element | null;
  try { return !!el?.closest?.(INTERACTIVE_SELECTOR); } catch (_) { return false; }
}

function isNarrow(binding: ResizerBinding): boolean {
  return !!binding.item.ownerDocument.defaultView
    ?.matchMedia("(max-width: 420px)").matches ||
    binding.container.getBoundingClientRect().width <= 599;
}

function getWidth(binding: ResizerBinding): number {
  const w = binding.item.style.getPropertyValue("--w").trim();
  if (w.endsWith("%")) {
    const n = parseFloat(w);
    if (Number.isFinite(n)) return n;
  }
  const cw = binding.container.getBoundingClientRect().width || 1;
  return (binding.item.getBoundingClientRect().width / cw) * 100;
}

function setHovered(interactions: DocumentInteractions, binding: ResizerBinding | null): void {
  if (interactions.hovered === binding) return;
  interactions.hovered?.resizer.classList.remove("dynFlexResizerHover");
  interactions.hovered = binding;
  binding?.resizer.classList.add("dynFlexResizerHover");
  interactions.doc.documentElement.classList.toggle("dynFlexResizeHover", !!binding);
}

function bindingAt(
  interactions: DocumentInteractions,
  x: number,
  y: number,
  target: EventTarget | null
): ResizerBinding | null {
  // The actual target remains the card content because the visible rail is
  // pointer-transparent. Native controls therefore win without synthetic
  // forwarding or z-index tricks.
  if (isInteractiveTarget(target)) return null;

  let best: ResizerBinding | null = null;
  let bestDistance = Infinity;
  for (const binding of [...interactions.bindings]) {
    if (!binding.resizer.isConnected ||
        binding.resizer.parentElement !== binding.item ||
        binding.item.parentElement !== binding.container) {
      interactions.bindings.delete(binding);
      resizerBindings.delete(binding.resizer);
      continue;
    }
    if (isNarrow(binding)) continue;
    const rect = binding.resizer.getBoundingClientRect();
    if (!rect.width || !rect.height ||
        x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    const distance = Math.abs(x - (rect.left + rect.right) / 2);
    if (distance < bestDistance) {
      best = binding;
      bestDistance = distance;
    }
  }
  return best;
}

function stopDrag(interactions: DocumentInteractions): void {
  const active = interactions.active;
  if (!active) return;
  active.binding.container.classList.remove("dynFlexDragging");
  active.binding.resizer.classList.remove("dynFlexResizerActive");
  try { active.binding.container.releasePointerCapture?.(active.pointerId); } catch (_) {}
  interactions.active = null;
}

function getDocumentInteractions(doc: Document): DocumentInteractions {
  const existing = documentInteractions.get(doc);
  if (existing) return existing;

  const interactions: DocumentInteractions = {
    doc,
    bindings: new Set(),
    active: null,
    hovered: null,
  };
  documentInteractions.set(doc, interactions);

  doc.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary || interactions.active) return;
    const binding = bindingAt(interactions, event.clientX, event.clientY, event.target);
    if (!binding) return;
    interactions.active = {
      binding,
      pointerId: event.pointerId,
      startX: event.clientX,
      startW: getWidth(binding),
    };
    binding.container.classList.add("dynFlexDragging");
    binding.resizer.classList.add("dynFlexResizerActive");
    try { binding.container.setPointerCapture?.(event.pointerId); } catch (_) {}
    event.preventDefault();
  }, { capture: true });

  doc.addEventListener("pointermove", event => {
    const active = interactions.active;
    if (!active) {
      setHovered(interactions,
        bindingAt(interactions, event.clientX, event.clientY, event.target));
      return;
    }
    if (event.pointerId !== active.pointerId) return;
    if (isNarrow(active.binding)) {
      stopDrag(interactions);
      setHovered(interactions, null);
      return;
    }
    const cw = active.binding.container.getBoundingClientRect().width || 1;
    const cfg = active.binding.state.cfg;
    const newW = clamp(
      active.startW + (event.clientX - active.startX) / cw * 100,
      cfg.min,
      cfg.max
    );
    active.binding.item.style.setProperty("--w", newW.toFixed(2) + "%");
    active.binding.state.persist();
    event.preventDefault();
  }, { capture: true });

  const finish = (event: PointerEvent) => {
    if (!interactions.active || event.pointerId !== interactions.active.pointerId) return;
    stopDrag(interactions);
    setHovered(interactions,
      event.type === "pointercancel"
        ? null
        : bindingAt(interactions, event.clientX, event.clientY, event.target));
    event.preventDefault();
  };
  doc.addEventListener("pointerup", finish, { capture: true });
  doc.addEventListener("pointercancel", finish, { capture: true });
  doc.addEventListener("pointerout", event => {
    if (!event.relatedTarget && !interactions.active) setHovered(interactions, null);
  }, { capture: true });

  // A pointer-transparent rail cannot contribute touch-action:none to browser
  // gesture negotiation. Cancel native touch gestures only when they start or
  // continue in a non-interactive resizer hit area; normal card scrolling and
  // all controls keep their native touch behavior.
  doc.addEventListener("touchstart", event => {
    const touch = event.touches[0] || event.changedTouches[0];
    if (touch && bindingAt(interactions, touch.clientX, touch.clientY, event.target)) {
      event.preventDefault();
    }
  }, { capture: true, passive: false });
  doc.addEventListener("touchmove", event => {
    const touch = event.touches[0] || event.changedTouches[0];
    if (interactions.active ||
        (touch && bindingAt(interactions, touch.clientX, touch.clientY, event.target))) {
      event.preventDefault();
    }
  }, { capture: true, passive: false });

  return interactions;
}

function unbindResizer(rz: HTMLElement): void {
  const binding = resizerBindings.get(rz);
  if (!binding) return;
  if (binding.interactions.active?.binding === binding) stopDrag(binding.interactions);
  if (binding.interactions.hovered === binding) setHovered(binding.interactions, null);
  binding.interactions.bindings.delete(binding);
  resizerBindings.delete(rz);
  delete rz.dataset.bound;
}

function bindResizer(
  rz: HTMLElement,
  container: HTMLElement,
  item: HTMLElement,
  state: ContainerState,
  doc: Document
): void {
  const existing = resizerBindings.get(rz);
  if (existing && existing.container === container && existing.item === item) {
    existing.state = state;
    return;
  }
  if (existing) unbindResizer(rz);

  const interactions = getDocumentInteractions(doc);
  const binding: ResizerBinding = { resizer: rz, container, item, state, interactions };
  interactions.bindings.add(binding);
  resizerBindings.set(rz, binding);
  rz.dataset.bound = "1";
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

function readConfig(el: HTMLElement): ContainerConfig {
  return {
    gap:   el.getAttribute("data-gap")   ? ensurePx(el.getAttribute("data-gap")!)   : "20px",
    hit:   el.getAttribute("data-hit")   ? ensurePx(el.getAttribute("data-hit")!)   : "22px",
    basis: parsePct(el.getAttribute("data-basis"), 25),
    min:   parsePct(el.getAttribute("data-min"),   10),
    max:   parsePct(el.getAttribute("data-max"),   100),
    store: el.getAttribute("data-store") || undefined,
  };
}

function makeState(el: HTMLElement): ContainerState {
  const state: ContainerState = {
    cfg: readConfig(el),
    items: [],
    persist: () => {},
  };
  state.persist = () => {
    const { store } = state.cfg;
    if (!store) return;
    // Resolve initial calc() widths only when the user first drags. This
    // preserves authored and stored percentages during ordinary reconciles.
    const cw = el.getBoundingClientRect().width;
    if (cw > 0) {
      state.items.forEach(it => {
        const w = it.style.getPropertyValue("--w").trim();
        if (!w.endsWith("%")) {
          const actual = (it.getBoundingClientRect().width / cw) * 100;
          if (Number.isFinite(actual) && actual > 0) {
            it.style.setProperty("--w", actual.toFixed(2) + "%");
          }
        }
      });
    }
    saveWidths(store, state.items.map(it =>
      it.style.getPropertyValue("--w").trim() || ""
    ));
  };
  containerStates.set(el, state);
  return state;
}

export function initContainer(container: Element, doc: Document): void {
  const el = container as HTMLElement;
  const state = containerStates.get(el) || makeState(el);
  const cfg = readConfig(el);
  state.cfg = cfg;

  el.style.setProperty("--dyn-gap",   cfg.gap);
  el.style.setProperty("--dyn-hit",   cfg.hit);
  el.style.setProperty("--dyn-basis", cfg.basis + "%");

  blockifyAll(container, doc);

  const previousItems = state.items.slice();
  const previousWidths = previousItems.map(it =>
    it.style.getPropertyValue("--w").trim()
  );
  const items = getDirectItems(container);

  // A direct wrapper may stop containing flex content while the container
  // survives. Remove only plugin-owned structure from such stale wrappers.
  previousItems.filter(it => !items.includes(it)).forEach(it => {
    if (it.classList.contains("dynFlexItem")) it.classList.remove("dynFlexItem");
    it.querySelectorAll<HTMLElement>(":scope > .dynFlexResizer").forEach(rz => {
      unbindResizer(rz);
      rz.remove();
    });
  });

  state.items = items;
  if (!items.length) return;

  items.forEach(it => {
    if (!it.classList.contains("dynFlexItem")) it.classList.add("dynFlexItem");
  });

  // A LiaScript rerender can replace direct wrappers while retaining the
  // container. Transfer widths by position, but never overwrite authored or
  // already restored values on surviving wrappers.
  items.forEach((it, i) => {
    if (it.style.getPropertyValue("--w").trim()) return;
    const previous = previousItems[i];
    const width = previousWidths[i];
    if (previous && previous !== it && !items.includes(previous) && width) {
      it.style.setProperty("--w", width);
    }
  });

  // Restore stored widths only when the current structure has no explicit or
  // transferred widths. Existing widths must survive every reconcile.
  if (cfg.store && !items.some(it => it.style.getPropertyValue("--w").trim())) {
    const stored = loadWidths(cfg.store);
    if (stored && stored.length === items.length) {
      items.forEach((it, i) => {
        const w = (stored[i] || "").trim();
        if (w.endsWith("%")) it.style.setProperty("--w", w);
      });
    }
  }

  // On first visit (no stored widths set), distribute all children evenly
  // so they fill 100% of the container width. Uses a CSS calc() expression so
  // no pixel measurements are needed and it stays correct on resize.
  // calc() values are never persisted (only "xx.xx%" values from dragging are
  // saved), so the even distribution is re-applied on every visit until the
  // user adjusts widths by dragging.
  const anyWidthSet = items.some(it => it.style.getPropertyValue("--w").trim());
  if (!anyWidthSet) {
    const n = items.length;
    const perRow = Math.min(n, 3);
    const evenWidth = perRow <= 1
      ? "100%"
      : `calc((100% - ${perRow - 1} * ${cfg.gap}) / ${perRow})`;
    items.forEach(it => it.style.setProperty("--w", evenWidth));
  }

  items.forEach((item, i) => {
    const existing = Array.from(
      item.querySelectorAll<HTMLElement>(":scope > .dynFlexResizer")
    );
    let rz = existing.shift();
    // Reconciliation repairs markup produced by an interrupted or repeated
    // render: one direct item always owns exactly one visible rail.
    existing.forEach(extra => {
      unbindResizer(extra);
      extra.remove();
    });
    if (!rz) {
      // Use the container's own document: nested courses and LiveEditor
      // previews initialize elements that do not belong to the global one.
      rz = doc.createElement("div");
      rz.className = "dynFlexResizer";
      rz.setAttribute("aria-hidden", "true");
      item.appendChild(rz);
    }
    const isEnd = i === items.length - 1;
    if (rz.classList.contains("dynFlexResizerEnd") !== isEnd) {
      rz.classList.toggle("dynFlexResizerEnd", isEnd);
    }
    bindResizer(rz, el, item, state, doc);
  });
}
