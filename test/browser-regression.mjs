import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { openBrowser } from "./cdp.mjs";

const bundle = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
const html = [
  "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head>",
  "<body style='margin:0;font:16px Arial,sans-serif'><main style='margin:20px'>",
  "<section class='dynFlex' data-store='responsive-test' id='deutsch'>",
  "<div class='flex-child'>Mila findet den Schlüssel.</div>",
  "<div class='flex-child'>Eine Dorfbewohnerin pflanzt neue Kräuter.</div>",
  "<div class='flex-child'>Am Abend trägt Mila den silbernen Schlüssel.</div>",
  "</section>",
  "<section class='dynFlex' id='math' style='width:min(1015px,calc(100vw - 40px));margin-top:50px'>",
  "<div class='flex-child' style='--w:70%'>Pentomino-Aufgabe e</div>",
  "<div class='flex-child' style='--w:3%'>Pentomino-Aufgabe f",
  "<button id='inventory' style='display:block;width:44px;height:520px;margin:100px 0 0 10px' onclick='this.dataset.clicks=String(+(this.dataset.clicks||0)+1)'>Inventar</button>",
  "</div></section>",
  "<section class='dynFlex' id='single-high' style='width:min(800px,calc(100vw - 40px));margin-top:50px'>",
  "<div class='flex-child' style='--w:55%'><div id='growing-content' style='height:360px'>Hohe Einzelkarte</div></div>",
  "</section>",
  "<section class='dynFlex' id='rerender' style='margin-top:50px'>",
  "<div style='--w:61%'><div class='flex-child'>Wrapper A</div></div>",
  "<div style='--w:29%'><div class='flex-child'>Wrapper B</div></div>",
  "</section>",
  "<section class='dynFlex' id='growing' style='margin-top:50px'>",
  "<div><div class='flex-child'>Bestehendes Kind</div></div>",
  "</section>",
  "<div id='dynamic-host' style='margin-top:50px'></div>",
  "</main><script>",
  "window.__dynflexStoreWrites=0;",
  "const originalSetItem=Storage.prototype.setItem;",
  "Storage.prototype.setItem=function(key,value){if(String(key).startsWith('dynFlexWidths::'))window.__dynflexStoreWrites++;return originalSetItem.call(this,key,value)};",
  "</script><script src='/dist/index.js'></script></body></html>"
].join("");
const server = createServer((req, res) => {
  res.setHeader("Content-Type", req.url === "/dist/index.js" ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8");
  res.end(req.url === "/dist/index.js" ? bundle : html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = "http://127.0.0.1:" + server.address().port + "/";
const b = await openBrowser();

const run = fn => b.evaluate("(" + fn.toString() + ")()");
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const viewport = async width => {
  await b.send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: false });
  await wait(80);
};
const frames = async (count = 2) => b.evaluate(`new Promise(resolve => {
  let left=${count};
  const next=()=>requestAnimationFrame(()=>--left?next():resolve());
  next();
})`);
const measure = () => {
  const box = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,w:r.width,h:r.height,right:r.right }; };
  const container = document.querySelector("#deutsch");
  return {
    container: box(container),
    items: [...container.querySelectorAll(":scope > .dynFlexItem")].map(el => ({
      box:box(el), inline:el.style.getPropertyValue("--w"),
      basis:getComputedStyle(el).flexBasis,
      scrollWidth:el.scrollWidth, clientWidth:el.clientWidth,
      handle:getComputedStyle(el.querySelector(":scope > .dynFlexResizer")).display
    })),
    store:localStorage.getItem("dynFlexWidths::responsive-test")
  };
};
const oneColumn = value => {
  assert.equal(value.items.length, 3);
  for (const item of value.items) {
    assert.equal(item.basis, "100%");
    assert.ok(Math.abs(item.box.x - value.container.x) < 1);
    assert.ok(Math.abs(item.box.w - value.container.w) < 1);
    assert.ok(item.scrollWidth <= item.clientWidth + 1, "text does not overflow its card");
    assert.equal(item.handle, "none");
  }
  assert.ok(value.items[0].box.y < value.items[1].box.y);
  assert.ok(value.items[1].box.y < value.items[2].box.y);
};
const mouse = async (type, x, y, buttons = 0) =>
  b.send("Input.dispatchMouseEvent", { type, x, y, button:"left", buttons, clickCount:1 });
const touch = async (type, points) =>
  b.send("Input.dispatchTouchEvent", { type, touchPoints:points });
const startFrameAudit = async () => run(() => {
  window.__dynFlexFrameAudit = { frames:0, violations:[], stopped:false };
  const directItems = container => {
    const items = [];
    for (const child of container.querySelectorAll(".flex-child")) {
      if (child.closest(".dynFlex") !== container) continue;
      let item = child;
      while (item && item.parentElement !== container) item = item.parentElement;
      if (item && !items.includes(item)) items.push(item);
    }
    return items;
  };
  const audit = () => {
    const state = window.__dynFlexFrameAudit;
    if (state.stopped) return;
    state.frames++;
    for (const container of document.querySelectorAll(".dynFlex")) {
      const rect = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      if (!rect.width || !rect.height || style.display === "none" || style.visibility === "hidden") continue;
      const expected = directItems(container);
      if (!expected.length) continue;
      const actual = [...container.querySelectorAll(":scope > .dynFlexItem")];
      const invalidItems = expected.filter(item =>
        !item.classList.contains("dynFlexItem") ||
        item.querySelectorAll(":scope > .dynFlexResizer").length !== 1
      );
      if (actual.length !== expected.length || invalidItems.length) {
        state.violations.push({
          frame:state.frames,
          id:container.id,
          kind:"structure",
          expected:expected.length,
          actual:actual.length,
          invalid:invalidItems.length
        });
        continue;
      }
      const last = expected[expected.length-1];
      const rail = last.querySelector(":scope > .dynFlexResizer");
      if (rail && getComputedStyle(rail).display !== "none") {
        const delta = Math.abs(last.getBoundingClientRect().height - rail.getBoundingClientRect().height);
        if (delta > 1) state.violations.push({
          frame:state.frames,
          id:container.id,
          kind:"height",
          delta
        });
      }
    }
    requestAnimationFrame(audit);
  };
  requestAnimationFrame(audit);
});
const stopFrameAudit = async () => {
  const state = await run(() => {
    window.__dynFlexFrameAudit.stopped = true;
    return window.__dynFlexFrameAudit;
  });
  assert.ok(state.frames > 0, "frame audit sampled rendered frames");
  assert.deepEqual(state.violations, [], "no paint exposes incomplete DynFlex structure or rail height");
  return state;
};
const assertOneResizerPerItem = async selector => {
  const counts = await b.evaluate(`[...document.querySelectorAll("${selector} > .dynFlexItem")]
    .map(item=>item.querySelectorAll(":scope > .dynFlexResizer").length)`);
  assert.ok(counts.length > 0, selector + " has initialized items");
  assert.deepEqual(counts, counts.map(() => 1), selector + " has exactly one resizer per direct item");
};

try {
  await viewport(390);
  await b.send("Page.navigate", { url });
  for (let i=0;i<100;i++) {
    if (await b.evaluate('document.querySelectorAll("#deutsch > .dynFlexItem").length') === 3) break;
    await wait(100);
  }
  oneColumn(await run(measure));
  assert.equal((await run(measure)).store, null);
  console.log("390 first visit: one column, readable text, hidden grips");

  await viewport(320);
  oneColumn(await run(measure));
  console.log("320: one column, readable text");

  await viewport(768);
  let data = await run(measure);
  assert.ok(data.items[0].box.x < data.items[1].box.x && data.items[1].box.x < data.items[2].box.x);
  console.log("768: three columns restored");

  await viewport(1366);
  data = await run(measure);
  assert.ok(data.items[0].box.x < data.items[1].box.x && data.items[1].box.x < data.items[2].box.x);
  const first = data.items[0].box.w;
  const grip = await run(() => {
    const r=document.querySelector("#deutsch > .dynFlexItem > .dynFlexResizer").getBoundingClientRect();
    return { x:r.x+r.width/2, y:r.y+22 };
  });
  await b.evaluate("window.__dynflexStoreWrites=0");
  await mouse("mouseMoved", grip.x, grip.y);
  await mouse("mousePressed", grip.x, grip.y, 1);
  await mouse("mouseMoved", grip.x+80, grip.y, 1);
  await mouse("mouseReleased", grip.x+80, grip.y);
  data=await run(measure);
  assert.ok(data.items[0].box.w > first+50, "drag changes width");
  const stored=data.store;
  assert.ok(stored && JSON.parse(stored).length === 3, "drag stores all widths");
  assert.equal(await b.evaluate("window.__dynflexStoreWrites"),1,
    "one pointer move invokes exactly one persisted drag handler");
  console.log("1366: mouse drag changes and saves widths through one handler");

  await viewport(390);
  oneColumn(await run(measure));
  assert.equal((await run(measure)).store, stored);
  await b.send("Page.reload");
  await wait(250);
  oneColumn(await run(measure));
  assert.equal((await run(measure)).store, stored);
  await viewport(768);
  data=await run(measure);
  assert.equal(data.store, stored);
  assert.ok(Math.abs(parseFloat(data.items[0].inline)-parseFloat(JSON.parse(stored)[0])) < 0.01);
  console.log("390 reload and 768 return: saved widths retained");
  await b.evaluate('document.querySelector("#deutsch").style.width="343px"');
  await wait(80);
  oneColumn(await run(measure));
  assert.equal((await run(measure)).store,stored);
  await b.evaluate('document.querySelector("#deutsch").style.removeProperty("width")');
  await wait(80);
  data=await run(measure);
  assert.equal(data.store,stored);
  assert.ok(data.items[0].box.x<data.items[1].box.x);
  console.log("768 with narrow course pane: one column, stored widths restored on widening");

  await viewport(1440);
  await startFrameAudit();

  const tallBefore=await run(() => {
    const item=document.querySelector("#single-high > .dynFlexItem");
    const rail=item.querySelector(":scope > .dynFlexResizer");
    const a=item.getBoundingClientRect(),b=rail.getBoundingClientRect();
    return {item:a.height,rail:b.height};
  });
  assert.ok(tallBefore.item>350,"single-card fixture is tall");
  assert.ok(Math.abs(tallBefore.item-tallBefore.rail)<=1,
    "single-card end rail matches the full card height");
  await b.evaluate('document.querySelector("#growing-content").style.height="680px"');
  await frames(3);
  const tallAfter=await run(() => {
    const item=document.querySelector("#single-high > .dynFlexItem");
    const rail=item.querySelector(":scope > .dynFlexResizer");
    return {
      item:item.getBoundingClientRect().height,
      rail:rail.getBoundingClientRect().height
    };
  });
  assert.ok(tallAfter.item>tallBefore.item+300,"card grows after initialization");
  assert.ok(Math.abs(tallAfter.item-tallAfter.rail)<=1,
    "end rail follows a later content-height change");
  console.log("1440: full-height end rail follows dynamic card growth");

  await run(() => {
    document.querySelector("#dynamic-host").innerHTML =
      "<section class='dynFlex' id='late'><div><div class='flex-child'>Late A</div></div>" +
      "<div><div class='flex-child'>Late B</div></div></section>";
  });
  await frames(3);
  await assertOneResizerPerItem("#late");

  await run(() => {
    document.querySelector("#rerender").innerHTML =
      "<article><div class='flex-child'>Rerender A</div></article>" +
      "<article><div class='flex-child'>Rerender B</div></article>";
  });
  await frames(3);
  await assertOneResizerPerItem("#rerender");
  assert.equal(
    await b.evaluate('document.querySelector("#rerender > .dynFlexItem").style.getPropertyValue("--w")'),
    "61%",
    "wrapper replacement preserves the existing width"
  );

  await run(() => {
    const wrapper=document.createElement("div");
    wrapper.innerHTML="<div class='flex-child'>Neues Kind</div>";
    document.querySelector("#growing").appendChild(wrapper);
  });
  await frames(3);
  await assertOneResizerPerItem("#growing");
  assert.equal(await b.evaluate('document.querySelectorAll("#growing > .dynFlexItem").length'),2,
    "new flex child is reconciled in an initialized container");

  await run(() => {
    const item=document.querySelector("#growing > .dynFlexItem");
    item.appendChild(document.createElement("div")).className="dynFlexResizer";
    const pending=document.createElement("section");
    pending.id="animated";
    pending.innerHTML="<div><div class='flex-child'>Animated A</div></div>" +
      "<div><div class='flex-child'>Animated B</div></div>";
    document.querySelector("#dynamic-host").appendChild(pending);
    requestAnimationFrame(()=>pending.classList.add("dynFlex"));
  });
  await frames(4);
  await assertOneResizerPerItem("#growing");
  await assertOneResizerPerItem("#animated");
  const audit=await stopFrameAudit();
  console.log("late insert, animated class change, child add and wrapper rerender:",
    audit.frames+" audited frames without an incomplete paint");

  const state=await run(() => {
    const button=document.querySelector("#inventory");
    button.scrollIntoView({block:"center"});
    const r=button.getBoundingClientRect();
    const x=r.x+r.width/2,y=r.y+r.height/2;
    const hit=document.elementFromPoint(x,y);
    const item=button.closest(".dynFlexItem");
    const grip=item.querySelector(".dynFlexResizer").getBoundingClientRect();
    return {
      x,y,
      buttonHit:hit===button||button.contains(hit),
      itemHeight:item.getBoundingClientRect().height,
      grip:{x:grip.x+grip.width/2,y:grip.y+grip.height/2,w:grip.width,h:grip.height}
    };
  });
  assert.equal(state.grip.w,22);
  assert.ok(state.grip.h>600,"inventory card has a tall end rail");
  assert.ok(Math.abs(state.grip.h-state.itemHeight)<=1,
    "inventory card and its full-height end rail match");
  assert.equal(state.buttonHit,true,"inventory center is a real hit target");
  await mouse("mousePressed",state.x,state.y,1);
  await mouse("mouseReleased",state.x,state.y);
  assert.equal(await b.evaluate('document.querySelector("#inventory").dataset.clicks'),"1");
  await b.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});
  await touch("touchStart",[{x:state.x,y:state.y,id:1}]);
  await touch("touchEnd",[]);
  assert.equal(await b.evaluate('document.querySelector("#inventory").dataset.clicks'),"2");
  console.log("1440: mouse and touch reach inventory center");

  await b.send("Emulation.setTouchEmulationEnabled",{enabled:false});
  const endGrip=await run(() => {
    const el=document.querySelector("#single-high > .dynFlexItem > .dynFlexResizer");
    el.scrollIntoView({block:"center"});
    const r=el.getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.bottom-8};
  });
  const initialEndWidth=parseFloat(await b.evaluate(
    'document.querySelector("#single-high > .dynFlexItem").style.getPropertyValue("--w")'
  ));
  await mouse("mouseMoved",endGrip.x,endGrip.y);
  await mouse("mousePressed",endGrip.x,endGrip.y,1);
  await mouse("mouseMoved",endGrip.x+80,endGrip.y,1);
  await mouse("mouseReleased",endGrip.x+80,endGrip.y);
  const lastWidth=await b.evaluate(
    'document.querySelector("#single-high > .dynFlexItem").style.getPropertyValue("--w")'
  );
  assert.ok(parseFloat(lastWidth)>initialEndWidth,
    "lower end-rail area resizes its card with the mouse");
  await b.evaluate('document.querySelector("#single-high > .dynFlexItem").style.setProperty("--w","55%")');
  await b.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});
  await touch("touchStart",[{x:endGrip.x,y:endGrip.y,id:2}]);
  await touch("touchMove",[{x:endGrip.x+80,y:endGrip.y,id:2}]);
  await touch("touchEnd",[]);
  const touchState=await run(() => {
    const item=document.querySelector("#single-high > .dynFlexItem");
    return {
      exists:!!item,
      width:item?.style.getPropertyValue("--w") || "",
      url:location.href,
      ids:[...document.querySelectorAll("[id]")].map(el=>el.id)
    };
  });
  assert.equal(touchState.exists,true,
    "touch drag keeps the rendered DynFlex course DOM intact: "+JSON.stringify(touchState));
  assert.ok(parseFloat(touchState.width)>55,
    "lower end-rail area resizes its card with touch");
  console.log("1440: lower full-height end rail drags by mouse and touch");
} finally {
  await b.close();
  await new Promise(resolve => server.close(resolve));
}
