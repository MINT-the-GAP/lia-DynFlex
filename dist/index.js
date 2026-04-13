const $1385bbac798b6a24$var$STYLE_ID = "lia-dynflex-style-v1-0";
const $1385bbac798b6a24$var$CSS = `
.dynFlex{
  --dyn-gap:  20px;
  --dyn-hit:  22px;
  --dyn-accent: var(--dynflex-accent, #0b5fff);
  --dyn-basis: 25%;

  display: flex !important;
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

  cursor: ew-resize !important;
  touch-action: none !important;
  background: transparent !important;
  z-index: 9999 !important;
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

.dynFlex > .dynFlexItem > .dynFlexResizer:hover::before{
  width: 3px !important;
}

@media (max-width: 420px){
  .dynFlex{ --dyn-basis: 100% !important; }
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
    function observe(rootWin) {
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
        try {
            const mql = rootWin.matchMedia("(prefers-color-scheme: dark)");
            const handler = ()=>update(true);
            if (mql.addEventListener) mql.addEventListener("change", handler);
            else if (mql.addListener) mql.addListener(handler);
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
        return Array.isArray(data) ? data : null;
    } catch (_) {
        return null;
    }
}


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
    if (fc.querySelector("input, textarea, select, button, .lia-btn, .lia-quiz")) return;
    const html = fc.innerHTML || "";
    if (!html.includes("[[")) {
        fc.dataset.dynflexBlockified = "1";
        return;
    }
    const parts = html.split(/\n[ \t]*\n+/).filter((p)=>p.replace(/\s+/g, "").length > 0);
    if (parts.length <= 1) {
        fc.dataset.dynflexBlockified = "1";
        return;
    }
    fc.innerHTML = "";
    for (const part of parts){
        const d = doc.createElement("div");
        d.setAttribute("data-dynflex-block", "1");
        d.innerHTML = part;
        fc.appendChild(d);
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
function $33087b216e99876d$var$bindResizer(rz, container, item, cfg, onSave) {
    if (rz.dataset.bound === "1") return;
    rz.dataset.bound = "1";
    let dragging = false, startX = 0, startW = 0;
    const getW = ()=>{
        const w = item.style.getPropertyValue("--w").trim();
        if (w.endsWith("%")) {
            const n = parseFloat(w);
            if (Number.isFinite(n)) return n;
        }
        const cw = container.getBoundingClientRect().width || 1;
        return item.getBoundingClientRect().width / cw * 100;
    };
    const onDown = (e)=>{
        dragging = true;
        container.classList.add("dynFlexDragging");
        startX = e.clientX;
        startW = getW();
        rz.setPointerCapture?.(e.pointerId);
        e.preventDefault();
    };
    const onMove = (e)=>{
        if (!dragging) return;
        const cw = container.getBoundingClientRect().width || 1;
        const newW = $33087b216e99876d$var$clamp(startW + (e.clientX - startX) / cw * 100, cfg.min, cfg.max);
        item.style.setProperty("--w", newW.toFixed(2) + "%");
        onSave();
        e.preventDefault();
    };
    const onUp = (e)=>{
        dragging = false;
        container.classList.remove("dynFlexDragging");
        try {
            rz.releasePointerCapture?.(e.pointerId);
        } catch (_) {}
        e.preventDefault();
    };
    rz.addEventListener("pointerdown", onDown);
    rz.addEventListener("pointermove", onMove);
    rz.addEventListener("pointerup", onUp);
    rz.addEventListener("pointercancel", onUp);
}
// ── Container init ────────────────────────────────────────────────────────────
function $33087b216e99876d$var$getDirectItems(container) {
    const flexChildren = Array.from(container.querySelectorAll(".flex-child")).filter((fc)=>fc.closest(".dynFlex") === container);
    if (!flexChildren.length) return [];
    const items = [];
    for (const fc of flexChildren){
        let it = fc;
        while(it && it.parentElement && it.parentElement !== container)it = it.parentElement;
        if (it && it.parentElement === container && !items.includes(it)) items.push(it);
    }
    return items;
}
function $33087b216e99876d$export$57d319145ef8fcba(container, doc) {
    const el = container;
    const cfg = {
        gap: el.getAttribute("data-gap") ? $33087b216e99876d$var$ensurePx(el.getAttribute("data-gap")) : "20px",
        hit: el.getAttribute("data-hit") ? $33087b216e99876d$var$ensurePx(el.getAttribute("data-hit")) : "22px",
        basis: $33087b216e99876d$var$parsePct(el.getAttribute("data-basis"), 25),
        min: $33087b216e99876d$var$parsePct(el.getAttribute("data-min"), 10),
        max: $33087b216e99876d$var$parsePct(el.getAttribute("data-max"), 100),
        store: el.getAttribute("data-store") || undefined
    };
    el.style.setProperty("--dyn-gap", cfg.gap);
    el.style.setProperty("--dyn-hit", cfg.hit);
    el.style.setProperty("--dyn-basis", cfg.basis + "%");
    $33087b216e99876d$var$blockifyAll(container, doc);
    const items = $33087b216e99876d$var$getDirectItems(container);
    if (!items.length) return;
    items.forEach((it)=>it.classList.add("dynFlexItem"));
    // Restore stored widths
    if (cfg.store) {
        const anySet = items.some((it)=>it.style.getPropertyValue("--w").trim());
        if (!anySet) {
            const stored = (0, $34de0361b1c4c74d$export$874f9d0b0b7048d)(cfg.store);
            if (stored && stored.length === items.length) items.forEach((it, i)=>{
                const w = (stored[i] || "").trim();
                if (w.endsWith("%")) it.style.setProperty("--w", w);
            });
        }
    }
    const persist = ()=>{
        if (cfg.store) (0, $34de0361b1c4c74d$export$7300864b179c42a)(cfg.store, items.map((it)=>it.style.getPropertyValue("--w").trim() || ""));
    };
    items.forEach((item, i)=>{
        let rz = item.querySelector(":scope > .dynFlexResizer");
        if (!rz) {
            rz = document.createElement("div");
            rz.className = "dynFlexResizer";
            rz.setAttribute("aria-hidden", "true");
            item.appendChild(rz);
        }
        if (i === items.length - 1) rz.classList.add("dynFlexResizerEnd");
        else rz.classList.remove("dynFlexResizerEnd");
        $33087b216e99876d$var$bindResizer(rz, container, item, cfg, persist);
    });
}


const $882b6d93070905b3$var$REGISTRY_KEY = "__LIA_DYNFLEX_V1_0__";
const $882b6d93070905b3$var$DOC_KEY_ATTR = "data-dynflex-doc";
(function() {
    // ── Window context ──────────────────────────────────────────────────────────
    function getRootWindow() {
        let w = window;
        try {
            while(w.parent && w.parent !== w)w = w.parent;
        } catch (_) {}
        return w;
    }
    const rootWin = getRootWindow();
    const rootDoc = rootWin.document;
    const contentDoc = document;
    // ── Run-once guard ──────────────────────────────────────────────────────────
    rootWin[$882b6d93070905b3$var$REGISTRY_KEY] = rootWin[$882b6d93070905b3$var$REGISTRY_KEY] || {
        docs: {}
    };
    let docKey = contentDoc.documentElement.getAttribute($882b6d93070905b3$var$DOC_KEY_ATTR);
    if (!docKey) {
        docKey = (contentDoc.baseURI || window.location.href || "dynflex") + "::" + Math.random().toString(36).slice(2);
        contentDoc.documentElement.setAttribute($882b6d93070905b3$var$DOC_KEY_ATTR, docKey);
    }
    if (rootWin[$882b6d93070905b3$var$REGISTRY_KEY].docs[docKey]) return;
    rootWin[$882b6d93070905b3$var$REGISTRY_KEY].docs[docKey] = true;
    // ── Style + theme ───────────────────────────────────────────────────────────
    (0, $1385bbac798b6a24$export$b9324dd3ed41badd)(rootDoc);
    (0, $1385bbac798b6a24$export$b9324dd3ed41badd)(contentDoc);
    const theme = (0, $67d8bd73256b8650$export$3d687a15f750108a)(rootDoc, contentDoc);
    theme.update(true);
    theme.observe(rootWin);
    // ── Scan ────────────────────────────────────────────────────────────────────
    const initialized = new WeakSet();
    function scanDoc(doc) {
        try {
            doc.querySelectorAll(".dynFlex").forEach((el)=>{
                if (!initialized.has(el)) {
                    initialized.add(el);
                    (0, $33087b216e99876d$export$57d319145ef8fcba)(el, doc);
                }
            });
        } catch (_) {}
    }
    function scan() {
        (0, $1385bbac798b6a24$export$b9324dd3ed41badd)(rootDoc);
        (0, $1385bbac798b6a24$export$b9324dd3ed41badd)(contentDoc);
        theme.update(false);
        scanDoc(rootDoc);
        scanDoc(contentDoc);
    }
    // Initial scans (staggered for late-rendering content)
    scan();
    [
        30,
        120,
        320,
        900
    ].forEach((ms)=>setTimeout(scan, ms));
    // ── DOM observer ────────────────────────────────────────────────────────────
    let scheduled = false;
    function scheduleScan() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(()=>{
            scheduled = false;
            scan();
        });
    }
    const mo = new MutationObserver((muts)=>{
        if (muts.some((m)=>m.addedNodes.length)) scheduleScan();
    });
    try {
        mo.observe(contentDoc.documentElement, {
            childList: true,
            subtree: true
        });
    } catch (_) {}
    try {
        mo.observe(rootDoc.documentElement, {
            childList: true,
            subtree: true
        });
    } catch (_) {}
})();


//# sourceMappingURL=index.js.map
