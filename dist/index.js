const $1385bbac798b6a24$var$STYLE_ID = "lia-dynflex-style-v1-0";
const $1385bbac798b6a24$var$CSS = `
.dynFlex{
  --dyn-gap:  20px;
  --dyn-hit:  22px;
  --dyn-accent: var(--dynflex-accent, #0b5fff);
  --dyn-basis: 25%;

  display: flex !important;
  container-type: inline-size;
  flex-wrap: wrap !important;
  align-items: flex-start !important;
  gap: var(--dyn-gap) !important;
  overflow: visible !important;
}

.dynFlex > .dynFlexItem{
  position: relative !important;
  box-sizing: border-box !important;
  min-width: 0 !important;

  flex: 0 0 var(--w, var(--dyn-basis)) !important;
  max-width: var(--w, var(--dyn-basis)) !important;

  padding: 0.65rem 1.25rem 0.65rem 0.85rem !important;
  border-left: 1px solid var(--dyn-accent) !important;
  border-radius: 10px !important;
  background: rgba(127,127,127,0.08) !important;

  overflow: visible !important;
}

.dynFlex > .dynFlexItem .flex-child{
  padding: 0 !important;
  border-left: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
}

.flex-child > [data-dynflex-block]{
  display: block !important;
  margin: 0 0 0.9rem 0 !important;
}
.flex-child > [data-dynflex-block]:last-child{
  margin-bottom: 0 !important;
}

.dynFlex.dynFlexDragging,
.dynFlex.dynFlexDragging *{
  user-select: none !important;
}

.dynFlex > .dynFlexItem > .dynFlexResizer{
  position: absolute !important;
  top: 0 !important;
  bottom: 0 !important;

  left: 100% !important;
  width: var(--dyn-hit) !important;
  margin-left: calc(var(--dyn-gap) / 2 - (var(--dyn-hit) / 2)) !important;

  background: transparent !important;
  z-index: 9999 !important;
  pointer-events: none !important;
}

.dynFlex > .dynFlexItem > .dynFlexResizer.dynFlexResizerEnd{
  left: auto !important;
  right: calc(-1 * (var(--dyn-gap) / 2) - (var(--dyn-hit) / 2)) !important;
  margin-left: 0 !important;
}

.dynFlex > .dynFlexItem > .dynFlexResizer::before{
  content: "" !important;
  position: absolute !important;
  left: 50% !important;
  top: 0 !important;
  bottom: 0 !important;
  width: 1px !important;
  transform: translateX(-50%) !important;
  background: var(--dyn-accent) !important;
  border-radius: 999px !important;
  opacity: 0.95 !important;
}

.dynFlexResizeHover,
.dynFlexResizeHover *{
  cursor: ew-resize !important;
}

.dynFlex > .dynFlexItem > .dynFlexResizer.dynFlexResizerHover::before,
.dynFlex > .dynFlexItem > .dynFlexResizer.dynFlexResizerActive::before{
  width: 3px !important;
}

@container (max-width: 599px){
  /* A narrow course pane needs one readable card even on a wide viewport. */
  .dynFlex > .dynFlexItem{
    flex-basis: 100% !important;
    max-width: 100% !important;
  }
  .dynFlex > .dynFlexItem > .dynFlexResizer{
    display: none !important;
  }
}

@media (max-width: 420px){
  /* Override the rendered size, keeping authored/dragged/stored --w intact. */
  .dynFlex > .dynFlexItem{
    flex-basis: 100% !important;
    max-width: 100% !important;
  }
  .dynFlex > .dynFlexItem > .dynFlexResizer{
    display: none !important;
  }
}
`.trim();
function $1385bbac798b6a24$export$b9324dd3ed41badd(doc) {
    try {
        if (!doc?.documentElement) return;
        if (doc.getElementById($1385bbac798b6a24$var$STYLE_ID)) return;
        const st = doc.createElement("style");
        st.id = $1385bbac798b6a24$var$STYLE_ID;
        st.textContent = $1385bbac798b6a24$var$CSS;
        (doc.head || doc.documentElement).appendChild(st);
    } catch (_) {}
}


const $67d8bd73256b8650$var$THEME_VARS = [
    "--lia-accent",
    "--lia-primary",
    "--lia-color-primary",
    "--primary",
    "--color-primary",
    "--accent-color"
];
const $67d8bd73256b8650$var$DEFAULT_ACCENT = "#0b5fff";
function $67d8bd73256b8650$var$pickAccent(doc) {
    try {
        const win = doc.defaultView || window;
        const cs = win.getComputedStyle(doc.documentElement);
        for (const v of $67d8bd73256b8650$var$THEME_VARS){
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
function $67d8bd73256b8650$var$applyAccent(doc, accent) {
    try {
        doc.documentElement.style.setProperty("--dynflex-accent", accent);
    } catch (_) {}
}
function $67d8bd73256b8650$export$3d687a15f750108a(rootDoc, contentDoc) {
    let lastAccent = "";
    function update(force = false) {
        const acc = $67d8bd73256b8650$var$pickAccent(rootDoc) || $67d8bd73256b8650$var$pickAccent(contentDoc) || $67d8bd73256b8650$var$DEFAULT_ACCENT;
        if (force || acc !== lastAccent) {
            lastAccent = acc;
            $67d8bd73256b8650$var$applyAccent(rootDoc, acc);
            $67d8bd73256b8650$var$applyAccent(contentDoc, acc);
        }
    }
    // Watch for theme switches so the accent follows the host. Both the observer
    // and the media-query listener are tied to `signal` so a single abort() on
    // teardown releases everything.
    function observe(rootWin, signal) {
        const mo = new MutationObserver(()=>update());
        const cfg = {
            attributes: true,
            attributeFilter: [
                "class",
                "style",
                "data-theme",
                "data-mode",
                "data-color-scheme"
            ]
        };
        try {
            mo.observe(rootDoc.documentElement, cfg);
        } catch (_) {}
        try {
            mo.observe(contentDoc.documentElement, cfg);
        } catch (_) {}
        signal.addEventListener("abort", ()=>mo.disconnect(), {
            once: true
        });
        try {
            const mql = rootWin.matchMedia("(prefers-color-scheme: dark)");
            if (mql.addEventListener) mql.addEventListener("change", ()=>update(true), {
                signal: signal
            });
        } catch (_) {}
    }
    return {
        update: update,
        observe: observe
    };
}


const $34de0361b1c4c74d$var$PREFIX = "dynFlexWidths::";
function $34de0361b1c4c74d$export$7300864b179c42a(key, widths) {
    try {
        localStorage.setItem($34de0361b1c4c74d$var$PREFIX + key, JSON.stringify(widths));
    } catch (_) {}
}
function $34de0361b1c4c74d$export$874f9d0b0b7048d(key) {
    try {
        const raw = localStorage.getItem($34de0361b1c4c74d$var$PREFIX + key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return null;
        // A corrupt or colliding key can yield non-strings; callers treat these as
        // CSS width values, so reject the whole entry rather than restoring junk.
        return data.every((w)=>typeof w === "string") ? data : null;
    } catch (_) {
        return null;
    }
}


const $33087b216e99876d$var$containerStates = new WeakMap();
const $33087b216e99876d$var$resizerBindings = new WeakMap();
const $33087b216e99876d$var$documentInteractions = new WeakMap();
const $33087b216e99876d$var$INTERACTIVE_SELECTOR = [
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
    ".lia-quiz"
].join(",");
const $33087b216e99876d$var$clamp = (x, a, b)=>Math.min(b, Math.max(a, x));
function $33087b216e99876d$var$parsePct(x, fallback) {
    if (!x) return fallback;
    const n = Number(x.trim().replace("%", ""));
    return Number.isFinite(n) ? n : fallback;
}
function $33087b216e99876d$var$ensurePx(v) {
    const t = v.trim();
    return t.endsWith("px") ? t : t + "px";
}
// ── Blockify ──────────────────────────────────────────────────────────────────
function $33087b216e99876d$var$blockifyFlexChild(fc, doc) {
    if (fc.dataset.dynflexBlockified === "1") return;
    if (fc.querySelector("input, textarea, select, button, .lia-btn, .lia-quiz")) {
        fc.dataset.dynflexBlockified = "1";
        return;
    }
    const parts = (fc.innerHTML || "").split(/\n[ \t]*\n+/).filter((p)=>p.replace(/\s+/g, "").length > 0);
    if (parts.length > 1 && fc.innerHTML.includes("[[")) {
        fc.innerHTML = "";
        for (const part of parts){
            const d = doc.createElement("div");
            d.setAttribute("data-dynflex-block", "1");
            d.innerHTML = part;
            fc.appendChild(d);
        }
    }
    fc.dataset.dynflexBlockified = "1";
}
function $33087b216e99876d$var$blockifyAll(container, doc) {
    try {
        container.querySelectorAll(".flex-child").forEach((fc)=>{
            if (fc.closest(".dynFlex") === container) $33087b216e99876d$var$blockifyFlexChild(fc, doc);
        });
    } catch (_) {}
}
// ── Resizer ───────────────────────────────────────────────────────────────────
function $33087b216e99876d$var$isInteractiveTarget(target) {
    const el = target;
    try {
        return !!el?.closest?.($33087b216e99876d$var$INTERACTIVE_SELECTOR);
    } catch (_) {
        return false;
    }
}
function $33087b216e99876d$var$isNarrow(binding) {
    return !!binding.item.ownerDocument.defaultView?.matchMedia("(max-width: 420px)").matches || binding.container.getBoundingClientRect().width <= 599;
}
function $33087b216e99876d$var$getWidth(binding) {
    const w = binding.item.style.getPropertyValue("--w").trim();
    if (w.endsWith("%")) {
        const n = parseFloat(w);
        if (Number.isFinite(n)) return n;
    }
    const cw = binding.container.getBoundingClientRect().width || 1;
    return binding.item.getBoundingClientRect().width / cw * 100;
}
function $33087b216e99876d$var$setHovered(interactions, binding) {
    if (interactions.hovered === binding) return;
    interactions.hovered?.resizer.classList.remove("dynFlexResizerHover");
    interactions.hovered = binding;
    binding?.resizer.classList.add("dynFlexResizerHover");
    interactions.doc.documentElement.classList.toggle("dynFlexResizeHover", !!binding);
}
function $33087b216e99876d$var$bindingAt(interactions, x, y, target) {
    // The actual target remains the card content because the visible rail is
    // pointer-transparent. Native controls therefore win without synthetic
    // forwarding or z-index tricks.
    if ($33087b216e99876d$var$isInteractiveTarget(target)) return null;
    let best = null;
    let bestDistance = Infinity;
    for (const binding of [
        ...interactions.bindings
    ]){
        if (!binding.resizer.isConnected || binding.resizer.parentElement !== binding.item || binding.item.parentElement !== binding.container) {
            interactions.bindings.delete(binding);
            $33087b216e99876d$var$resizerBindings.delete(binding.resizer);
            continue;
        }
        if ($33087b216e99876d$var$isNarrow(binding)) continue;
        const rect = binding.resizer.getBoundingClientRect();
        if (!rect.width || !rect.height || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
        const distance = Math.abs(x - (rect.left + rect.right) / 2);
        if (distance < bestDistance) {
            best = binding;
            bestDistance = distance;
        }
    }
    return best;
}
function $33087b216e99876d$var$stopDrag(interactions) {
    const active = interactions.active;
    if (!active) return;
    active.binding.container.classList.remove("dynFlexDragging");
    active.binding.resizer.classList.remove("dynFlexResizerActive");
    try {
        active.binding.container.releasePointerCapture?.(active.pointerId);
    } catch (_) {}
    interactions.active = null;
}
function $33087b216e99876d$var$getDocumentInteractions(doc) {
    const existing = $33087b216e99876d$var$documentInteractions.get(doc);
    if (existing) return existing;
    const interactions = {
        doc: doc,
        bindings: new Set(),
        active: null,
        hovered: null
    };
    $33087b216e99876d$var$documentInteractions.set(doc, interactions);
    doc.addEventListener("pointerdown", (event)=>{
        if (event.button !== 0 || !event.isPrimary || interactions.active) return;
        const binding = $33087b216e99876d$var$bindingAt(interactions, event.clientX, event.clientY, event.target);
        if (!binding) return;
        interactions.active = {
            binding: binding,
            pointerId: event.pointerId,
            startX: event.clientX,
            startW: $33087b216e99876d$var$getWidth(binding)
        };
        binding.container.classList.add("dynFlexDragging");
        binding.resizer.classList.add("dynFlexResizerActive");
        try {
            binding.container.setPointerCapture?.(event.pointerId);
        } catch (_) {}
        event.preventDefault();
    }, {
        capture: true
    });
    doc.addEventListener("pointermove", (event)=>{
        const active = interactions.active;
        if (!active) {
            $33087b216e99876d$var$setHovered(interactions, $33087b216e99876d$var$bindingAt(interactions, event.clientX, event.clientY, event.target));
            return;
        }
        if (event.pointerId !== active.pointerId) return;
        if ($33087b216e99876d$var$isNarrow(active.binding)) {
            $33087b216e99876d$var$stopDrag(interactions);
            $33087b216e99876d$var$setHovered(interactions, null);
            return;
        }
        const cw = active.binding.container.getBoundingClientRect().width || 1;
        const cfg = active.binding.state.cfg;
        const newW = $33087b216e99876d$var$clamp(active.startW + (event.clientX - active.startX) / cw * 100, cfg.min, cfg.max);
        active.binding.item.style.setProperty("--w", newW.toFixed(2) + "%");
        active.binding.state.persist();
        event.preventDefault();
    }, {
        capture: true
    });
    const finish = (event)=>{
        if (!interactions.active || event.pointerId !== interactions.active.pointerId) return;
        $33087b216e99876d$var$stopDrag(interactions);
        $33087b216e99876d$var$setHovered(interactions, event.type === "pointercancel" ? null : $33087b216e99876d$var$bindingAt(interactions, event.clientX, event.clientY, event.target));
        event.preventDefault();
    };
    doc.addEventListener("pointerup", finish, {
        capture: true
    });
    doc.addEventListener("pointercancel", finish, {
        capture: true
    });
    doc.addEventListener("pointerout", (event)=>{
        if (!event.relatedTarget && !interactions.active) $33087b216e99876d$var$setHovered(interactions, null);
    }, {
        capture: true
    });
    // A pointer-transparent rail cannot contribute touch-action:none to browser
    // gesture negotiation. Cancel native touch gestures only when they start or
    // continue in a non-interactive resizer hit area; normal card scrolling and
    // all controls keep their native touch behavior.
    doc.addEventListener("touchstart", (event)=>{
        const touch = event.touches[0] || event.changedTouches[0];
        if (touch && $33087b216e99876d$var$bindingAt(interactions, touch.clientX, touch.clientY, event.target)) event.preventDefault();
    }, {
        capture: true,
        passive: false
    });
    doc.addEventListener("touchmove", (event)=>{
        const touch = event.touches[0] || event.changedTouches[0];
        if (interactions.active || touch && $33087b216e99876d$var$bindingAt(interactions, touch.clientX, touch.clientY, event.target)) event.preventDefault();
    }, {
        capture: true,
        passive: false
    });
    return interactions;
}
function $33087b216e99876d$var$unbindResizer(rz) {
    const binding = $33087b216e99876d$var$resizerBindings.get(rz);
    if (!binding) return;
    if (binding.interactions.active?.binding === binding) $33087b216e99876d$var$stopDrag(binding.interactions);
    if (binding.interactions.hovered === binding) $33087b216e99876d$var$setHovered(binding.interactions, null);
    binding.interactions.bindings.delete(binding);
    $33087b216e99876d$var$resizerBindings.delete(rz);
    delete rz.dataset.bound;
}
function $33087b216e99876d$var$bindResizer(rz, container, item, state, doc) {
    const existing = $33087b216e99876d$var$resizerBindings.get(rz);
    if (existing && existing.container === container && existing.item === item) {
        existing.state = state;
        return;
    }
    if (existing) $33087b216e99876d$var$unbindResizer(rz);
    const interactions = $33087b216e99876d$var$getDocumentInteractions(doc);
    const binding = {
        resizer: rz,
        container: container,
        item: item,
        state: state,
        interactions: interactions
    };
    interactions.bindings.add(binding);
    $33087b216e99876d$var$resizerBindings.set(rz, binding);
    rz.dataset.bound = "1";
}
// ── Container init ────────────────────────────────────────────────────────────
function $33087b216e99876d$var$directChildOf(container, node) {
    let it = node;
    while(it && it.parentElement !== container)it = it.parentElement;
    return it && it.parentElement === container ? it : null;
}
function $33087b216e99876d$var$getDirectItems(container) {
    const seen = new Set();
    container.querySelectorAll(".flex-child").forEach((fc)=>{
        if (fc.closest(".dynFlex") !== container) return;
        const it = $33087b216e99876d$var$directChildOf(container, fc);
        if (it) seen.add(it);
    });
    return [
        ...seen
    ];
}
function $33087b216e99876d$var$readConfig(el) {
    return {
        gap: el.getAttribute("data-gap") ? $33087b216e99876d$var$ensurePx(el.getAttribute("data-gap")) : "20px",
        hit: el.getAttribute("data-hit") ? $33087b216e99876d$var$ensurePx(el.getAttribute("data-hit")) : "22px",
        basis: $33087b216e99876d$var$parsePct(el.getAttribute("data-basis"), 25),
        min: $33087b216e99876d$var$parsePct(el.getAttribute("data-min"), 10),
        max: $33087b216e99876d$var$parsePct(el.getAttribute("data-max"), 100),
        store: el.getAttribute("data-store") || undefined
    };
}
function $33087b216e99876d$var$makeState(el) {
    const state = {
        cfg: $33087b216e99876d$var$readConfig(el),
        items: [],
        persist: ()=>{}
    };
    state.persist = ()=>{
        const { store: store } = state.cfg;
        if (!store) return;
        // Resolve initial calc() widths only when the user first drags. This
        // preserves authored and stored percentages during ordinary reconciles.
        const cw = el.getBoundingClientRect().width;
        if (cw > 0) state.items.forEach((it)=>{
            const w = it.style.getPropertyValue("--w").trim();
            if (!w.endsWith("%")) {
                const actual = it.getBoundingClientRect().width / cw * 100;
                if (Number.isFinite(actual) && actual > 0) it.style.setProperty("--w", actual.toFixed(2) + "%");
            }
        });
        (0, $34de0361b1c4c74d$export$7300864b179c42a)(store, state.items.map((it)=>it.style.getPropertyValue("--w").trim() || ""));
    };
    $33087b216e99876d$var$containerStates.set(el, state);
    return state;
}
function $33087b216e99876d$export$57d319145ef8fcba(container, doc) {
    const el = container;
    const state = $33087b216e99876d$var$containerStates.get(el) || $33087b216e99876d$var$makeState(el);
    const cfg = $33087b216e99876d$var$readConfig(el);
    state.cfg = cfg;
    el.style.setProperty("--dyn-gap", cfg.gap);
    el.style.setProperty("--dyn-hit", cfg.hit);
    el.style.setProperty("--dyn-basis", cfg.basis + "%");
    $33087b216e99876d$var$blockifyAll(container, doc);
    const previousItems = state.items.slice();
    const previousWidths = previousItems.map((it)=>it.style.getPropertyValue("--w").trim());
    const items = $33087b216e99876d$var$getDirectItems(container);
    // A direct wrapper may stop containing flex content while the container
    // survives. Remove only plugin-owned structure from such stale wrappers.
    previousItems.filter((it)=>!items.includes(it)).forEach((it)=>{
        if (it.classList.contains("dynFlexItem")) it.classList.remove("dynFlexItem");
        it.querySelectorAll(":scope > .dynFlexResizer").forEach((rz)=>{
            $33087b216e99876d$var$unbindResizer(rz);
            rz.remove();
        });
    });
    state.items = items;
    if (!items.length) return;
    items.forEach((it)=>{
        if (!it.classList.contains("dynFlexItem")) it.classList.add("dynFlexItem");
    });
    // A LiaScript rerender can replace direct wrappers while retaining the
    // container. Transfer widths by position, but never overwrite authored or
    // already restored values on surviving wrappers.
    items.forEach((it, i)=>{
        if (it.style.getPropertyValue("--w").trim()) return;
        const previous = previousItems[i];
        const width = previousWidths[i];
        if (previous && previous !== it && !items.includes(previous) && width) it.style.setProperty("--w", width);
    });
    // Restore stored widths only when the current structure has no explicit or
    // transferred widths. Existing widths must survive every reconcile.
    if (cfg.store && !items.some((it)=>it.style.getPropertyValue("--w").trim())) {
        const stored = (0, $34de0361b1c4c74d$export$874f9d0b0b7048d)(cfg.store);
        if (stored && stored.length === items.length) items.forEach((it, i)=>{
            const w = (stored[i] || "").trim();
            if (w.endsWith("%")) it.style.setProperty("--w", w);
        });
    }
    // On first visit (no stored widths set), distribute all children evenly
    // so they fill 100% of the container width. Uses a CSS calc() expression so
    // no pixel measurements are needed and it stays correct on resize.
    // calc() values are never persisted (only "xx.xx%" values from dragging are
    // saved), so the even distribution is re-applied on every visit until the
    // user adjusts widths by dragging.
    const anyWidthSet = items.some((it)=>it.style.getPropertyValue("--w").trim());
    if (!anyWidthSet) {
        const n = items.length;
        const perRow = Math.min(n, 3);
        const evenWidth = perRow <= 1 ? "100%" : `calc((100% - ${perRow - 1} * ${cfg.gap}) / ${perRow})`;
        items.forEach((it)=>it.style.setProperty("--w", evenWidth));
    }
    items.forEach((item, i)=>{
        const existing = Array.from(item.querySelectorAll(":scope > .dynFlexResizer"));
        let rz = existing.shift();
        // Reconciliation repairs markup produced by an interrupted or repeated
        // render: one direct item always owns exactly one visible rail.
        existing.forEach((extra)=>{
            $33087b216e99876d$var$unbindResizer(extra);
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
        if (rz.classList.contains("dynFlexResizerEnd") !== isEnd) rz.classList.toggle("dynFlexResizerEnd", isEnd);
        $33087b216e99876d$var$bindResizer(rz, el, item, state, doc);
    });
}


const $882b6d93070905b3$var$REGISTRY_KEY = "__LIA_DYNFLEX_V1_0__";
const $882b6d93070905b3$var$DOC_KEY_ATTR = "data-dynflex-doc";
(function() {
    // ── Window context ──────────────────────────────────────────────────────────
    function isLiaScriptHost(win) {
        try {
            return !!win.document.querySelector("#lia-toolbar-nav, header.lia-header, .lia-canvas");
        } catch (_) {
            return false;
        }
    }
    function isLiveEditorPreview(win) {
        try {
            return win.frameElement?.id === "liascript-preview";
        } catch (_) {
            return false;
        }
    }
    function getRootWindow() {
        const contentWindow = window;
        let candidate = contentWindow;
        while(true){
            // Nested courses and LiveEditor previews are complete LiaScript hosts.
            // Keep styles, observers, and the registry inside the nearest host
            // instead of leaking into a surrounding course or editor.
            if (isLiveEditorPreview(candidate) || isLiaScriptHost(candidate)) return candidate;
            try {
                const parent = candidate.parent;
                if (!parent || parent === candidate) return contentWindow;
                // Validate access before advancing. Otherwise a cross-origin LMS host
                // becomes the selected root and rootWin.document below throws before
                // DynFlex can inject styles or initialize any container.
                parent.document;
                candidate = parent;
            } catch (_) {
                return contentWindow;
            }
        }
    }
    const rootWin = getRootWindow();
    const rootDoc = rootWin.document;
    const contentDoc = document;
    // ── Run-once guard ──────────────────────────────────────────────────────────
    const host = rootWin;
    const registry = host[$882b6d93070905b3$var$REGISTRY_KEY] || {
        docs: {}
    };
    host[$882b6d93070905b3$var$REGISTRY_KEY] = registry;
    const existingKey = contentDoc.documentElement.getAttribute($882b6d93070905b3$var$DOC_KEY_ATTR);
    const docKey = existingKey || (contentDoc.baseURI || "dynflex") + "::" + Math.random().toString(36).slice(2);
    if (!existingKey) contentDoc.documentElement.setAttribute($882b6d93070905b3$var$DOC_KEY_ATTR, docKey);
    if (registry.docs[docKey]) return;
    registry.docs[docKey] = true;
    // ── Teardown ────────────────────────────────────────────────────────────────
    // Everything that outlives a single slide hangs off this signal, so unloading
    // the content document releases the observers and listeners in one abort()
    // instead of leaving them attached to a document that is no longer rendered.
    const teardown = new AbortController();
    const { signal: signal } = teardown;
    // ── Style + theme ───────────────────────────────────────────────────────────
    (0, $1385bbac798b6a24$export$b9324dd3ed41badd)(rootDoc);
    (0, $1385bbac798b6a24$export$b9324dd3ed41badd)(contentDoc);
    const theme = (0, $67d8bd73256b8650$export$3d687a15f750108a)(rootDoc, contentDoc);
    theme.update(true);
    theme.observe(rootWin, signal);
    // ── Scan ────────────────────────────────────────────────────────────────────
    function scanDoc(doc) {
        try {
            doc.querySelectorAll(".dynFlex").forEach((el)=>{
                // initContainer is an idempotent reconcile. Running it for known
                // containers is intentional: LiaScript can replace their direct
                // wrappers or add flex children without replacing the container.
                (0, $33087b216e99876d$export$57d319145ef8fcba)(el, doc);
            });
        } catch (_) {}
    }
    function scan() {
        theme.update(false);
        scanDoc(rootDoc);
        if (contentDoc !== rootDoc) scanDoc(contentDoc);
    }
    // Initial scans (staggered for late-rendering content)
    scan();
    const timers = [
        30,
        120,
        320,
        900
    ].map((ms)=>setTimeout(scan, ms));
    signal.addEventListener("abort", ()=>timers.forEach((t)=>clearTimeout(t)), {
        once: true
    });
    // ── DOM observer ────────────────────────────────────────────────────────────
    const mo = new MutationObserver((muts)=>{
        if (signal.aborted) return;
        if (muts.some((m)=>m.type === "childList" && (m.addedNodes.length || m.removedNodes.length) || m.type === "attributes" && m.attributeName === "class" && (()=>{
                const target = m.target;
                const oldClasses = new Set((m.oldValue || "").split(/\s+/).filter(Boolean));
                return oldClasses.has("dynFlex") !== target.classList.contains("dynFlex") || oldClasses.has("flex-child") !== target.classList.contains("flex-child");
            })())) // MutationObserver callbacks run in the pre-paint microtask checkpoint.
        // Reconcile synchronously so newly rendered LiaScript content cannot be
        // painted for one frame without DynFlex's item structure.
        scan();
    });
    const mutationOptions = {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
            "class"
        ],
        attributeOldValue: true
    };
    try {
        mo.observe(contentDoc.documentElement, mutationOptions);
    } catch (_) {}
    try {
        mo.observe(rootDoc.documentElement, mutationOptions);
    } catch (_) {}
    signal.addEventListener("abort", ()=>mo.disconnect(), {
        once: true
    });
    // When the content document goes away, release everything and drop the
    // registry entry so a fresh document under the same host can initialize.
    rootWin.addEventListener("pagehide", ()=>{
        delete registry.docs[docKey];
        teardown.abort();
    }, {
        once: true
    });
})();


//# sourceMappingURL=index.js.map
