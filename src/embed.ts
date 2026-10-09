/** LiaScript's generic iframe fallback measures its width only on connect. */
interface EmbedState {
  embed: HTMLElement;
  root: ParentNode;
  mutations: MutationObserver;
  resize: ResizeObserver;
  frame: HTMLIFrameElement | null;
  originalHeight: string;
  pendingFrame: number | null;
  appliedHeight: string | null;
}

/**
 * Current LiaScript uses a closed shadow root and exposes its wrapper as div_.
 * Keep that compatibility dependency here: never patch attachShadow/prototypes,
 * and leave unfamiliar component versions alone. No iframe document access is
 * needed, so cross-origin sites work without reloading their browsing context.
 */
function embedRoot(embed: HTMLElement): ParentNode | null {
  if (embed.shadowRoot) return embed.shadowRoot;
  const wrapper = (embed as HTMLElement & { div_?: HTMLElement }).div_;
  if (wrapper?.nodeType !== 1 || wrapper.ownerDocument !== embed.ownerDocument) return null;
  const root = wrapper.getRootNode() as ShadowRoot;
  return root.host === embed ? wrapper : null;
}

function hasAuthoredHeight(embed: HTMLElement, frame: HTMLIFrameElement): boolean {
  if (embed.hasAttribute("height") || frame.hasAttribute("height")) return true;
  if (embed.style.height && embed.style.height !== "auto") return true;
  if (embed.style.blockSize || embed.style.aspectRatio) return true;
  try {
    const attrs = JSON.parse(embed.getAttribute("data-attributes") || "{}");
    if (!attrs || typeof attrs !== "object") return true;
    if (Object.keys(attrs).some(key => key.toLowerCase() === "height")) return true;
    const style = embed.ownerDocument.createElement("div").style;
    style.cssText = typeof attrs.style === "string" ? attrs.style : "";
    return !!(style.height || style.blockSize || style.aspectRatio);
  } catch (_) {
    // Malformed author options must not become permission to override them.
    return true;
  }
}

function fallbackFrame(state: EmbedState): HTMLIFrameElement | null {
  const frames = state.root.querySelectorAll<HTMLIFrameElement>("iframe");
  if (frames.length !== 1) return null;
  const frame = frames[0];
  const url = (state.embed as HTMLElement & { url?: string }).url;
  if (!url || frame.hasAttribute("srcdoc")) return null;
  try {
    // oEmbed providers (videos, widgets, etc.) own their own sizing. Only the
    // generic fallback uses the original requested URL as the iframe source.
    return new URL(frame.getAttribute("src") || "", state.embed.baseURI).href ===
      new URL(url, state.embed.baseURI).href ? frame : null;
  } catch (_) {
    return null;
  }
}

function restoreHeight(state: EmbedState): void {
  const { frame, appliedHeight } = state;
  // Do not undo a later height written by the author or another component.
  if (frame && appliedHeight !== null && frame.style.height === appliedHeight &&
      !frame.style.getPropertyPriority("height")) {
    if (state.originalHeight) frame.style.height = state.originalHeight;
    else frame.style.removeProperty("height");
  }
  state.frame = null;
  state.appliedHeight = null;
}

export function makeEmbedManager(doc: Document, signal: AbortSignal): { scan: () => void } {
  const win = doc.defaultView;
  const states = new Map<HTMLElement, EmbedState>();
  const belongs = (embed: HTMLElement) => embed.isConnected &&
    embed.ownerDocument === doc && !!embed.closest(".flex-child")?.closest(".dynFlex");

  function update(state: EmbedState): void {
    if (signal.aborted || states.get(state.embed) !== state || !belongs(state.embed) || !win) return;
    const frame = fallbackFrame(state);
    if (frame !== state.frame) restoreHeight(state);
    if (!frame || hasAuthoredHeight(state.embed, frame)) {
      restoreHeight(state);
      return;
    }
    if (frame.style.getPropertyPriority("height")) return;
    if (state.appliedHeight !== null && frame.style.height !== state.appliedHeight) return;

    const parent = state.embed.parentElement;
    if (!parent || !state.embed.getClientRects().length) return;
    const padding = parseFloat(win.getComputedStyle(parent).paddingLeft) || 0;
    const width = parent.clientWidth - padding - 30;
    // Hidden/zero-width animation steps get a real measurement when revealed.
    if (!Number.isFinite(width) || width <= 0) return;
    const authoredScale = Number(state.embed.getAttribute("scale"));
    const scale = Number.isFinite(authoredScale) && authoredScale > 0 ? authoredScale : 0.674;
    let height = Math.max(1, Math.floor(width * scale));
    const available = win.screen.availHeight;
    if (available > 0 && height > available) height = Math.max(1, Math.floor(available * scale));
    if (!Number.isFinite(height)) return;

    if (!state.frame) {
      state.frame = frame;
      state.originalHeight = frame.style.height;
    }
    const value = height + "px";
    if (frame.style.height !== value) frame.style.height = value;
    state.appliedHeight = value;
  }

  function stop(state: EmbedState): void {
    state.mutations.disconnect();
    state.resize.disconnect();
    if (state.pendingFrame !== null) win?.cancelAnimationFrame(state.pendingFrame);
    restoreHeight(state);
    states.delete(state.embed);
  }

  function scan(): void {
    if (signal.aborted || !win || typeof ResizeObserver === "undefined") return;
    for (const state of states.values()) {
      if (!belongs(state.embed) || embedRoot(state.embed) !== state.root) stop(state);
    }
    doc.querySelectorAll<HTMLElement>(".dynFlex .flex-child lia-embed").forEach(embed => {
      let state = states.get(embed);
      if (!state) {
        const root = embedRoot(embed);
        if (!root) return;
        const mutations = new MutationObserver(() => update(created));
        let lastWidth = -1;
        const resize = new ResizeObserver(entries => {
          const width = entries[0]?.contentRect.width;
          if (width === lastWidth) return;
          lastWidth = width;
          // Writing a height inside ResizeObserver feeds back into its own
          // observation. Coalesce width changes into the next animation frame.
          if (created.pendingFrame === null) {
            created.pendingFrame = win.requestAnimationFrame(() => {
              created.pendingFrame = null;
              update(created);
            });
          }
        });
        const created: EmbedState = {
          embed, root, mutations, resize, frame: null,
          originalHeight: "", appliedHeight: null, pendingFrame: null,
        };
        state = created;
        states.set(embed, state);
        mutations.observe(embed, {
          attributes: true,
          attributeFilter: ["style", "height", "scale", "data-attributes"],
        });
        mutations.observe(root as Node, {
          childList: true, subtree: true, attributes: true,
          attributeFilter: ["src", "height"],
        });
        resize.observe(embed);
      }
      update(state);
    });
  }

  const resizeAll = () => states.forEach(update);
  win?.addEventListener("resize", resizeAll);
  // An import may run before the browser has upgraded lia-embed elements.
  void win?.customElements?.whenDefined("lia-embed").then(scan);
  signal.addEventListener("abort", () => {
    win?.removeEventListener("resize", resizeAll);
    states.forEach(stop);
  }, { once: true });
  return { scan };
}
