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
  "</div></section></main><script src='/dist/index.js'></script></body></html>"
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
  await mouse("mouseMoved", grip.x, grip.y);
  await mouse("mousePressed", grip.x, grip.y, 1);
  await mouse("mouseMoved", grip.x+80, grip.y, 1);
  await mouse("mouseReleased", grip.x+80, grip.y);
  data=await run(measure);
  assert.ok(data.items[0].box.w > first+50, "drag changes width");
  const stored=data.store;
  assert.ok(stored && JSON.parse(stored).length === 3, "drag stores all widths");
  console.log("1366: mouse drag changes and saves widths");

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
  const state=await run(() => {
    const button=document.querySelector("#inventory");
    button.scrollIntoView({block:"center"});
    const r=button.getBoundingClientRect();
    const x=r.x+r.width/2,y=r.y+r.height/2;
    const hit=document.elementFromPoint(x,y);
    const grip=button.closest(".dynFlexItem").querySelector(".dynFlexResizer").getBoundingClientRect();
    return {x,y,buttonHit:hit===button||button.contains(hit),grip:{x:grip.x+grip.width/2,y:grip.y+grip.height/2,w:grip.width,h:grip.height}};
  });
  assert.equal(state.grip.w,22);
  assert.equal(state.grip.h,44);
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
    const el=document.querySelector("#math > .dynFlexItem:last-child > .dynFlexResizer");
    el.scrollIntoView({block:"center"});
    const r=el.getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2};
  });
  await mouse("mouseMoved",endGrip.x,endGrip.y);
  await mouse("mousePressed",endGrip.x,endGrip.y,1);
  await mouse("mouseMoved",endGrip.x+80,endGrip.y,1);
  await mouse("mouseReleased",endGrip.x+80,endGrip.y);
  const lastWidth=await b.evaluate('document.querySelector("#math > .dynFlexItem:last-child").style.getPropertyValue("--w")');
  assert.ok(parseFloat(lastWidth)>=10,"end grip still resizes its card");
  await b.evaluate('document.querySelector("#math > .dynFlexItem:last-child").style.setProperty("--w","3%")');
  await b.send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:1});
  await touch("touchStart",[{x:endGrip.x,y:endGrip.y,id:2}]);
  await touch("touchMove",[{x:endGrip.x+80,y:endGrip.y,id:2}]);
  await touch("touchEnd",[]);
  const touchWidth=await b.evaluate('document.querySelector("#math > .dynFlexItem:last-child").style.getPropertyValue("--w")');
  assert.ok(parseFloat(touchWidth)>=10,"touch drag still resizes the last card");
  console.log("1440: end grip changes width by mouse and touch");
} finally {
  await b.close();
  await new Promise(resolve => server.close(resolve));
}
