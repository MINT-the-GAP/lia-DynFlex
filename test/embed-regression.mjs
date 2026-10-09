import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { openBrowser } from "./cdp.mjs";

const bundle = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
// Reproduce LiaScript's one-time measurement and asynchronous closed-shadow
// fallback (LiaScript/LiaScript fcdaca0425600068fb6e993f4863200bd5af53ea,
// src/typescript/webcomponents/embed/index.ts). No third-party network needed.
function fixture() {
  window.framesForTest = new Map();
  window.embedErrors = [];
  window.addEventListener("error", e => window.embedErrors.push(e.message));
  window.defineEmbed = () => customElements.define("lia-embed", class extends HTMLElement {
    constructor() {
      super();
      this.div_ = document.createElement("div");
      this.div_.style.cssText = "width:inherit;height:inherit;display:inline-block";
      this.attachShadow({ mode:"closed" }).append(this.div_);
      window.framesForTest.set(this, this.div_);
    }
    connectedCallback() {
      if (this.connected_) return;
      this.connected_ = true;
      this.url = this.getAttribute("url");
      const width = this.parentElement.clientWidth -
        parseFloat(getComputedStyle(this.parentElement).paddingLeft) - 30;
      const scale = parseFloat(this.getAttribute("scale") || "0.674");
      this.maxheight = Math.floor(width * (scale || 0.674));
      if (this.maxheight > screen.availHeight) this.maxheight = Math.floor(screen.availHeight * (scale || 0.76));
      const root = this.div_;
      if (this.hasAttribute("unknown")) delete this.div_;
      this.renderForTest = () => {
        const frame = document.createElement("iframe");
        frame.src = this.hasAttribute("provider") ? this.url.replace("/frame", "/provider") : this.url;
        frame.style.cssText = "width:100%;height:" + (this.hasAttribute("provider") ? "234px" : this.maxheight + "px");
        let attrs = {};
        try { attrs = JSON.parse(this.getAttribute("data-attributes") || "{}"); } catch (_) {}
        for (const [key, value] of Object.entries(attrs)) {
          if (key === "style") frame.style.cssText += value;
          else frame.setAttribute(key, value);
        }
        root.replaceChildren(frame);
      };
      setTimeout(this.renderForTest, Number(this.getAttribute("delay") || "0"));
    }
  });
  window.addTestEmbed = (id, options = {}) => {
    const section = document.createElement("section");
    section.className = options.outside ? "plain" : "dynFlex";
    section.style.cssText = "width:1100px;margin-top:20px";
    section.id = "section-" + id;
    if (options.hidden) section.style.setProperty("display", "none", "important");
    const card = document.createElement("div");
    card.className = "flex-child";
    card.style.setProperty("--w", "60%");
    const media = document.createElement("div");
    const embed = document.createElement("lia-embed");
    embed.id = id;
    embed.style.cssText = "width:100%;height:auto;display:inline-block";
    embed.setAttribute("url", window.testFrameURL + "?id=" + id);
    for (const [key, value] of Object.entries(options.attributes || {})) embed.setAttribute(key, value);
    media.append(embed); card.append(media); section.append(card);
    document.body.append(section);
    return id;
  };
}

const requests = new Map();
let frameURL;
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost");
  requests.set(req.url, (requests.get(req.url) || 0) + 1);
  if (path.pathname === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle);
  } else if (path.pathname === "/component.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end("(" + fixture.toString() + ")();");
  } else if (path.pathname === "/frame" || path.pathname === "/provider") {
    res.setHeader("Content-Type", "text/html");
    res.end("<!doctype html><title>Frame</title><input value='state to preserve'>");
  } else {
    const mode = path.searchParams.get("mode") || "early";
    res.setHeader("Content-Type", "text/html");
    res.end([
      "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>",
      "<style>body{margin:0;font:16px Arial}main{width:1200px;margin:20px}lia-embed{width:100%;height:auto;display:inline-block}</style>",
      "<script src='/component.js'></script>",
      "<script>window.testFrameURL=" + JSON.stringify(frameURL) + ";</script>",
      mode === "upgrade" ? "" : "<script>window.defineEmbed();</script>",
      mode !== "late" ? "<script src='/bundle.js'></script>" : "",
      "</head><body><main><section class='dynFlex' id='main-container'>",
      "<div class='flex-child'><h3>Eine lange Beschreibung mit mehreren Worten und Unterrichtsmaterialien</h3></div>",
      "<div class='flex-child' id='main-card'><div><lia-embed id='main' url='" + frameURL + "?id=main'></lia-embed></div></div>",
      "</section></main>",
      mode === "late" ? "<script src='/bundle.js'></script>" : "",
      mode === "upgrade" ? "<script>setTimeout(window.defineEmbed,50);</script>" : "",
      "</body></html>",
    ].join(""));
  }
});
await new Promise(resolve => server.listen(0, "0.0.0.0", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
frameURL = "http://localhost:" + server.address().port + "/frame";
const b = await openBrowser();
const errors = [];
b.on("Runtime.exceptionThrown", e => errors.push(e.exceptionDetails.text));
const run = (fn, arg) => b.evaluate("(" + fn.toString() + ")(" + JSON.stringify(arg ?? null) + ")");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const settle = () => b.evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))))");
async function ready(id) {
  for (let i = 0; i < 100; i++) {
    if (await run(id => !!window.framesForTest?.get(document.getElementById(id))?.querySelector("iframe"), id)) {
      await settle();
      return;
    }
    await wait(30);
  }
  throw new Error("Embed did not render: " + id);
}
const measure = id => run(id => {
  const embed = document.getElementById(id);
  const frame = window.framesForTest.get(embed).querySelector("iframe");
  return {
    height:frame.clientHeight, css:frame.style.height, width:embed.clientWidth,
    initial:embed.maxheight, frameHeightAttribute:frame.getAttribute("height"),
    priority:frame.style.getPropertyPriority("height"),
  };
}, id);
async function add(id, options) {
  await run(([id, options]) => window.addTestEmbed(id, options), [id, options || {}]);
  await ready(id);
  return measure(id);
}

try {
  await b.send("Emulation.setDeviceMetricsOverride", { width:1500, height:1100, screenWidth:1500, screenHeight:1100, deviceScaleFactor:1, mobile:false });
  const heights = [];
  for (const mode of ["early", "late", "upgrade"]) {
    await b.send("Page.navigate", { url:origin + "/?mode=" + mode });
    await ready("main");
    const state = await measure("main");
    assert.ok(state.height > 200, mode + ": usable height");
    heights.push(state.height);
    console.log(mode + ":", JSON.stringify(state));
  }
  assert.equal(new Set(heights).size, 1, "initialization order does not change the final iframe height");

  await b.send("Page.reload");
  await ready("main");
  assert.equal((await measure("main")).height, heights[0], "reload has the same height");
  await run(() => {
    const frame = window.framesForTest.get(document.getElementById("main")).querySelector("iframe");
    window.savedFrame = frame;
    window.savedWindow = frame.contentWindow;
    document.getElementById("main-card").style.setProperty("--w", "80%");
  });
  await settle();
  assert.ok((await measure("main")).height > heights[0] + 100, "resizing the card grows its iframe");
  // Wait for the initial iframe request, then assert no resize triggers another.
  await wait(150);
  const loadsBefore = requests.get("/frame?id=main");
  for (const width of ["45%", "75%", "55%", "85%"]) {
    await run(width => document.getElementById("main-card").style.setProperty("--w", width), width);
    await settle();
  }
  assert.equal(await run(() => {
    const frame = window.framesForTest.get(document.getElementById("main")).querySelector("iframe");
    return frame === window.savedFrame && frame.contentWindow === window.savedWindow;
  }), true, "resizing preserves the iframe node and browsing context");
  assert.equal(requests.get("/frame?id=main"), loadsBefore, "resizing makes no new iframe requests");

  const delayed = await add("delayed", { attributes:{ delay:"120" } });
  assert.ok(delayed.height > 300, "late fallback is sized after it appears");
  const hidden = await add("hidden", { hidden:true, attributes:{ delay:"30" } });
  assert.equal(hidden.height, 0);
  await run(() => document.getElementById("section-hidden").style.removeProperty("display"));
  await settle();
  assert.ok((await measure("hidden")).height > 300, "initially hidden embed is measured when revealed");

  for (const [id, attrs] of [
    ["explicit-style", { "data-attributes":JSON.stringify({ style:"height:480px;" }) }],
    ["explicit-important", { "data-attributes":JSON.stringify({ style:"height:460px !important;" }) }],
    ["explicit-attribute", { "data-attributes":JSON.stringify({ height:"420" }) }],
    ["explicit-host", { style:"width:100%;height:510px;display:inline-block" }],
    ["provider", { provider:"" }],
    ["unknown", { unknown:"" }],
    ["malformed", { "data-attributes":"{" }],
  ]) {
    const before = await add(id, { attributes:attrs });
    await run(id => document.getElementById("section-" + id).style.width = "700px", id);
    await settle();
    assert.equal((await measure(id)).css, before.css, id + ": preserves authored/unsupported/provider sizing");
    if (id === "explicit-style") assert.equal(before.height, 480);
    if (id === "explicit-important") assert.equal(before.height, 460);
    if (id === "explicit-attribute") assert.equal(before.frameHeightAttribute, "420");
    if (id === "provider") assert.equal(before.height, 234);
  }
  const outside = await add("outside", { outside:true });
  await run(() => document.getElementById("section-outside").style.width = "700px");
  await settle();
  assert.equal((await measure("outside")).css, outside.css, "embeds outside DynFlex are untouched");

  const scaled = await add("scaled", { attributes:{ scale:"0.5" } });
  await run(() => document.getElementById("scaled").setAttribute("scale", "0.8"));
  await settle();
  assert.ok((await measure("scaled")).height > scaled.height, "authored scale changes are respected");
  await run(() => document.getElementById("scaled").setAttribute("scale", "NaN"));
  await settle();
  assert.ok(Number.isFinite((await measure("scaled")).height), "invalid scale cannot produce an invalid height");

  await run(() => {
    const embed = document.getElementById("delayed");
    embed.setAttribute("data-attributes", JSON.stringify({ style:"height:444px" }));
    window.framesForTest.get(embed).querySelector("iframe").style.height = "444px";
  });
  await settle();
  await run(() => document.getElementById("section-delayed").style.width = "700px");
  await settle();
  assert.equal((await measure("delayed")).height, 444, "later authored height takes precedence");

  await run(() => {
    const embed = document.getElementById("hidden");
    window.previousFrame = window.framesForTest.get(embed).querySelector("iframe");
    embed.renderForTest();
  });
  await settle();
  assert.ok((await measure("hidden")).height > 300, "a replacement fallback frame is corrected");

  await run(() => document.getElementById("section-scaled").classList.remove("dynFlex"));
  await settle();
  const released = await measure("scaled");
  await run(() => document.getElementById("section-scaled").style.width = "700px");
  await settle();
  assert.equal((await measure("scaled")).css, released.css, "leaving DynFlex releases the observer and height override");

  const beforeDuplicate = await measure("main");
  await b.evaluate("(function(){" + bundle + "\n})()");
  await settle();
  assert.equal((await measure("main")).height, beforeDuplicate.height, "duplicate bundle evaluation is harmless");

  await run(() => window.dispatchEvent(new Event("pagehide")));
  await settle();
  const disposed = await measure("main");
  await run(() => document.getElementById("main-card").style.setProperty("--w", "30%"));
  await settle();
  assert.equal((await measure("main")).css, disposed.css, "teardown stops resizing");
  assert.deepEqual(errors, [], "no browser exceptions");
  assert.deepEqual(await run(() => window.embedErrors), [], "no observer or browser error events");
  console.log("PASS: embed initialization, reload, resize, async/hidden content, explicit sizing, providers, cleanup, and no reloads");
} finally {
  await b.close();
  await new Promise(resolve => server.close(resolve));
}
