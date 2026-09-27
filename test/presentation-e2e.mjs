import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { openBrowser } from "./cdp.mjs";

const COURSE_REVISION = "fd8edf72604f80933eebdacc0bfba991596343a2";
const courseSource =
  "https://raw.githubusercontent.com/MINT-the-GAP/Wochenaufgabe/" +
  COURSE_REVISION + "/Alt/Vortrag280626.md";
const courseUrl = "https://liascript.github.io/course/?" + courseSource;

const [readme, bundle] = await Promise.all([
  readFile(new URL("../README.md", import.meta.url), "utf8"),
  readFile(new URL("../dist/index.js", import.meta.url), "utf8"),
]);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const auditSource = `(() => {
  const state = window.__dynFlexE2E = {
    active:false,
    frames:0,
    visibleContainerFrames:0,
    structureSamples:0,
    heightSamples:0,
    maxLastDelta:0,
    maxAnyDelta:0,
    violations:[],
    sampledSlides:{}
  };
  const reset = () => {
    state.active=true;
    state.frames=0;
    state.visibleContainerFrames=0;
    state.structureSamples=0;
    state.heightSamples=0;
    state.maxLastDelta=0;
    state.maxAnyDelta=0;
    state.violations=[];
    state.sampledSlides={};
  };
  state.reset=reset;
  const directItems = container => {
    const items=[];
    for (const child of container.querySelectorAll(".flex-child")) {
      if (child.closest(".dynFlex") !== container) continue;
      let item=child;
      while (item && item.parentElement !== container) item=item.parentElement;
      if (item && !items.includes(item)) items.push(item);
    }
    return items;
  };
  const isVisible = element => {
    const rect=element.getBoundingClientRect();
    const style=getComputedStyle(element);
    return rect.width>0 && rect.height>0 &&
      rect.right>0 && rect.left<innerWidth && rect.bottom>0 && rect.top<innerHeight &&
      style.display!=="none" && style.visibility!=="hidden" && style.opacity!=="0";
  };
  const violation = data => {
    if (state.violations.length<200) {
      state.violations.push(Object.assign({
        frame:state.frames,
        hash:location.hash,
        time:performance.now()
      },data));
    }
  };
  const tick = () => {
    if (state.active) {
      state.frames++;
      state.sampledSlides[location.hash||"#?"] =
        (state.sampledSlides[location.hash||"#?"]||0)+1;
      let visibleContainers=0;
      for (const container of document.querySelectorAll(".dynFlex")) {
        if (!isVisible(container)) continue;
        const expected=directItems(container);
        if (!expected.length) continue;
        visibleContainers++;
        state.structureSamples++;
        const actual=[...container.querySelectorAll(":scope > .dynFlexItem")];
        const invalid=expected.filter(item =>
          !item.classList.contains("dynFlexItem") ||
          item.querySelectorAll(":scope > .dynFlexResizer").length!==1
        );
        if (actual.length!==expected.length || invalid.length) {
          violation({
            kind:"structure",
            expected:expected.length,
            actual:actual.length,
            invalid:invalid.length
          });
          continue;
        }
        expected.forEach((item,index) => {
          if (!isVisible(item)) return;
          const rail=item.querySelector(":scope > .dynFlexResizer");
          if (!rail || getComputedStyle(rail).display==="none") return;
          const delta=Math.abs(
            item.getBoundingClientRect().height-rail.getBoundingClientRect().height
          );
          state.heightSamples++;
          state.maxAnyDelta=Math.max(state.maxAnyDelta,delta);
          if (index===expected.length-1) {
            state.maxLastDelta=Math.max(state.maxLastDelta,delta);
            if (delta>1) violation({kind:"last-height",delta});
          }
        });
      }
      if (visibleContainers) state.visibleContainerFrames++;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;

const browser = await openBrowser();
const intercepted = [];
const interceptionErrors = [];

const waitFor = async (expression, message, attempts = 240) => {
  for (let i=0; i<attempts; i++) {
    if (await browser.evaluate(expression)) return;
    await wait(250);
  }
  assert.fail(message);
};

const frames = async (count = 3) => browser.evaluate(`new Promise(resolve => {
  let left=${count};
  const next=()=>requestAnimationFrame(()=>--left?next():resolve());
  next();
})`);

browser.on("Fetch.requestPaused", async event => {
  try {
    const url = event.request.url;
    const dynFlexRequest = /MINT-the-GAP\/lia-DynFlex/i.test(url);
    if (!dynFlexRequest) {
      await browser.send("Fetch.continueRequest", { requestId:event.requestId });
      return;
    }
    const isBundle = /\/dist\/index\.js(?:\?|$)/i.test(url);
    const isReadme = /\/README\.md(?:\?|$)/i.test(url);
    if (!isBundle && !isReadme) {
      await browser.send("Fetch.continueRequest", { requestId:event.requestId });
      return;
    }
    const body = isBundle ? bundle : readme;
    intercepted.push({ url, kind:isBundle ? "bundle" : "readme" });
    await browser.send("Fetch.fulfillRequest", {
      requestId:event.requestId,
      responseCode:200,
      responseHeaders:[
        { name:"Content-Type", value:isBundle
          ? "text/javascript; charset=utf-8"
          : "text/markdown; charset=utf-8" },
        { name:"Access-Control-Allow-Origin", value:"*" },
        { name:"Cache-Control", value:"no-store" },
      ],
      body:Buffer.from(body).toString("base64"),
    });
  } catch (error) {
    interceptionErrors.push(String(error?.stack || error));
  }
});

try {
  await browser.send("Emulation.setDeviceMetricsOverride", {
    width:1366,
    height:768,
    deviceScaleFactor:1,
    mobile:false,
  });
  await browser.send("Fetch.enable", {
    patterns:[{ urlPattern:"*MINT-the-GAP/lia-DynFlex*", requestStage:"Request" }],
  });
  await browser.send("Page.addScriptToEvaluateOnNewDocument", { source:auditSource });

  const expectedSlides=Array.from({length:10},(_,index)=>"#"+(index+1));
  const results=[];
  for (let run=1; run<=4; run++) {
    const interceptedBefore=intercepted.length;
    await browser.send("Page.navigate", { url:"about:blank" });
    await waitFor('location.href==="about:blank"',
      "run "+run+": fresh document did not open");
    await browser.send("Page.navigate", { url:courseUrl+"#1" });
    await waitFor(
      `document.readyState==="complete" &&
       document.querySelector("#lia-btn-next") &&
       document.querySelectorAll(".dynFlexItem").length>0 &&
       window.__dynFlexE2E`,
      "run "+run+": real LiaScript course did not become ready"
    );

    await browser.evaluate(`(() => {
      window.__dynFlexE2E.reset();
      document.querySelector("#lia-mode-presentation").click();
    })()`);
    await waitFor(
      'document.querySelector(".lia-canvas")?.classList.contains("lia-mode--presentation")',
      "run "+run+": presentation mode did not activate"
    );
    const tocWasOpen=await browser.evaluate(
      'document.querySelector("#lia-toc")?.classList.contains("lia-toc--open") || false'
    );
    if (tocWasOpen) {
      await browser.evaluate('document.querySelector("#lia-btn-toc").click()');
    }
    await waitFor(
      '!document.querySelector("#lia-toc")?.classList.contains("lia-toc--open")',
      "run "+run+": table of contents did not close"
    );
    await frames(6);

    const visited=new Set([await browser.evaluate("location.hash")]);
    const actionStates=[];
    for (let action=1; action<=60; action++) {
      const clicked=await browser.evaluate(`(() => {
        const button=document.querySelector("#lia-btn-next");
        if (!button || button.disabled) return false;
        button.click();
        return true;
      })()`);
      assert.equal(clicked,true,"run "+run+", action "+action+": next button is available");
      await frames(3);
      await wait(20);
      const actionState=await browser.evaluate(`(() => ({
        hash:location.hash,
        tocOpen:document.querySelector("#lia-toc")?.classList.contains("lia-toc--open")||false,
        visibleDynFlex:[...document.querySelectorAll(".dynFlex")].filter(el=>{
          const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
          return rect.width>0 && rect.height>0 && rect.bottom>0 && rect.top<innerHeight &&
            style.display!=="none" && style.visibility!=="hidden";
        }).length,
        violations:window.__dynFlexE2E.violations.length
      }))()`);
      actionStates.push(actionState);
      visited.add(actionState.hash);
      assert.equal(actionState.tocOpen,false,
        "run "+run+", action "+action+": table of contents stays closed");
    }
    await frames(8);

    const summary=await browser.evaluate(`(() => {
      const state=window.__dynFlexE2E;
      return {
        width:innerWidth,
        height:innerHeight,
        hash:location.hash,
        frames:state.frames,
        visibleContainerFrames:state.visibleContainerFrames,
        structureSamples:state.structureSamples,
        heightSamples:state.heightSamples,
        maxLastDelta:state.maxLastDelta,
        maxAnyDelta:state.maxAnyDelta,
        violations:state.violations,
        sampledSlides:state.sampledSlides,
        tocOpen:document.querySelector("#lia-toc")?.classList.contains("lia-toc--open")||false,
        localStyle:!!document.getElementById("lia-dynflex-style-v1-0"),
        localDocKey:document.documentElement.hasAttribute("data-dynflex-doc"),
        boundRails:document.querySelectorAll(".dynFlexResizer[data-bound='1']").length
      };
    })()`);
    const runIntercepts=intercepted.slice(interceptedBefore);

    assert.equal(actionStates.length,60,"run "+run+": exactly 60 actions executed");
    assert.equal(summary.width,1366,"run "+run+": viewport width");
    assert.equal(summary.height,768,"run "+run+": viewport height");
    assert.equal(summary.hash,"#10","run "+run+": all actions end on slide 10");
    assert.deepEqual([...visited].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1))),
      expectedSlides,"run "+run+": all ten slides were visited");
    assert.equal(summary.tocOpen,false,"run "+run+": table of contents remains closed");
    assert.ok(summary.visibleContainerFrames>0,"run "+run+": visible DynFlex frames sampled");
    assert.ok(summary.structureSamples>0,"run "+run+": DynFlex structures sampled");
    assert.ok(summary.heightSamples>0,"run "+run+": card and resizer heights sampled");
    assert.ok(summary.maxLastDelta<=1,
      "run "+run+": every visible last rail stays within 1px of its card");
    assert.ok(summary.maxAnyDelta<=1,
      "run "+run+": inner rails stay within 1px of their cards");
    assert.deepEqual(summary.violations,[],
      "run "+run+": no paint contains incomplete DynFlex or a bad last-rail height");
    assert.equal(summary.localStyle,true,
      "run "+run+": DynFlex 1.0 style is installed");
    assert.equal(summary.localDocKey,true,
      "run "+run+": DynFlex local bundle initialized the document");
    assert.ok(summary.boundRails>0,
      "run "+run+": local DynFlex bundle bound resizers");
    assert.deepEqual(interceptionErrors,[],"run "+run+": request interception succeeds");

    results.push({
      run,
      actions:actionStates.length,
      slides:[...visited].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1))),
      tocClosed:!summary.tocOpen,
      frames:summary.frames,
      visibleContainerFrames:summary.visibleContainerFrames,
      structureSamples:summary.structureSamples,
      heightSamples:summary.heightSamples,
      maxLastDelta:summary.maxLastDelta,
      maxAnyDelta:summary.maxAnyDelta,
      violations:summary.violations.length,
      boundRails:summary.boundRails,
      localBundleLoads:runIntercepts.filter(entry=>entry.kind==="bundle").length
    });
    console.log("presentation run "+run+"/4:",JSON.stringify(results.at(-1)));
  }

  console.log(JSON.stringify({
    course:"MINT-the-GAP/Wochenaufgabe/Alt/Vortrag280626.md",
    revision:COURSE_REVISION,
    viewport:"1366x768",
    mode:"presentation",
    results
  },null,2));
  assert.ok(intercepted.some(entry=>entry.kind==="readme") &&
    intercepted.some(entry=>entry.kind==="bundle"),
    "the real course used the intercepted local DynFlex README and bundle");
} finally {
  await browser.close();
}
