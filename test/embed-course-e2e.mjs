import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openBrowser } from "./cdp.mjs";

const target = process.argv[2];
if (!target) throw new Error("Usage: node test/embed-course-e2e.mjs <course URL ending in #4>");
const course = new URL(target);
const expectedHash = course.hash || "#4";
const previousHash = "#" + (Number(expectedHash.slice(1)) - 1);
const [bundle, readme] = await Promise.all([
  readFile(new URL("../dist/index.js", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8"),
]);
const b = await openBrowser();
const interceptionErrors = [];
let bundleLoads = 0;
b.on("Fetch.requestPaused", async event => {
  try {
    const isBundle = new URL(event.request.url).pathname.endsWith("/dist/index.js");
    const body = isBundle ? bundle : readme;
    if (isBundle) bundleLoads++;
    await b.send("Fetch.fulfillRequest", {
      requestId:event.requestId, responseCode:200,
      responseHeaders:[
        { name:"Content-Type", value:isBundle ? "text/javascript; charset=utf-8" : "text/markdown; charset=utf-8" },
        { name:"Access-Control-Allow-Origin", value:"*" },
      ],
      body:Buffer.from(body).toString("base64"),
    });
  } catch (e) { interceptionErrors.push(String(e)); }
});
const wait = ms => new Promise(r => setTimeout(r, ms));
const run = (fn, arg) => b.evaluate("(" + fn.toString() + ")(" + JSON.stringify(arg ?? null) + ")");
async function until(expression) {
  for (let i = 0; i < 150; i++) {
    if (await b.evaluate(expression)) return;
    await wait(100);
  }
  throw new Error("Timed out: " + expression);
}
const frameReady = "document.querySelector('lia-embed')?.div_?.querySelector('iframe')";
const measure = () => run(() => {
  const embed = document.querySelector("lia-embed");
  const frame = embed.div_.querySelector("iframe");
  return { width:embed.getBoundingClientRect().width, height:frame.clientHeight, css:frame.style.height, initial:embed.maxheight };
});
try {
  await b.send("Emulation.setDeviceMetricsOverride", {
    width:1600, height:1000, screenWidth:1600, screenHeight:1000, deviceScaleFactor:1, mobile:false,
  });
  await b.send("Page.addScriptToEvaluateOnNewDocument", {
    source:"window.__embedErrors=[];window.addEventListener('error',e=>window.__embedErrors.push(e.message));",
  });
  await b.send("Fetch.enable", { patterns:[{ urlPattern:"*MINT-the-GAP/lia-DynFlex*", requestStage:"Request" }] });
  course.hash = previousHash;
  await b.send("Page.navigate", { url:course.href });
  await until("!!document.querySelector('#lia-dynflex-style-v1-0')");
  await run(hash => { location.hash = hash; }, expectedHash);
  await until(frameReady);
  await wait(300);
  const navigation = await measure();

  await b.send("Page.reload");
  await until(frameReady);
  await until("!!document.querySelector('#lia-dynflex-style-v1-0')");
  await wait(300);
  const reload = await measure();
  assert.equal(navigation.width, reload.width, "final widths match");
  assert.equal(navigation.height, reload.height, "navigation and reload have identical iframe heights");
  assert.ok(navigation.height > 200, "the embed is not stuck at its premature small height");

  await run(() => {
    const embed = document.querySelector("lia-embed");
    window.__savedEmbedFrame = embed.div_.querySelector("iframe");
    window.__savedEmbedWindow = window.__savedEmbedFrame.contentWindow;
    embed.closest(".dynFlexItem").style.setProperty("--w", "100%");
  });
  await wait(150);
  const widened = await measure();
  assert.ok(widened.height > reload.height + 100, "actual course iframe grows with its card");
  assert.equal(await run(() => {
    const frame = document.querySelector("lia-embed").div_.querySelector("iframe");
    return frame === window.__savedEmbedFrame && frame.contentWindow === window.__savedEmbedWindow;
  }), true, "course iframe and browsing context survive resizing");
  const observerErrors = await run(() => window.__embedErrors.filter(message => /ResizeObserver/i.test(message)));
  assert.deepEqual(observerErrors, [], "no ResizeObserver feedback errors");
  assert.deepEqual(interceptionErrors, []);
  assert.ok(bundleLoads >= 2, "both navigations use the locally built DynFlex bundle");
  console.log(JSON.stringify({ navigation, reload, widened, bundleLoads }, null, 2));
} finally {
  await b.close();
}
