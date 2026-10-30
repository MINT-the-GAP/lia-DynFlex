import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { openBrowser } from "./cdp.mjs";

const bundle = await readFile(new URL("../dist/index.js", import.meta.url), "utf8");
const children = count => Array.from({ length: count }, (_, i) =>
  `<div class="flex-child"><div style="height:70px">Item ${i + 1}</div></div>`
).join("");
const fixture = (attributes = "", count = 3, content = children(count)) =>
  `<section class="dynFlex" id="layout" ${attributes}>${content}</section>`;
const persistedFixture = fixture('data-store="attributes-layout"', 4);
const zeroFixture = fixture('data-min="0" data-store="attributes-zero"', 3);
const roundingFixture = fixture('data-store="attributes-rounding" style="width:999px"', 3);
const routeFixtures = { "/storage": persistedFixture, "/storage-zero": zeroFixture, "/storage-rounding": roundingFixture };
const server = createServer((req, res) => {
  if (req.url === "/dist/index.js") {
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
    res.end(bundle);
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{margin:0;font:16px Arial,sans-serif}main{margin:20px;width:min(1000px,calc(100vw - 40px))}</style>
    </head><body><main id="host">${routeFixtures[req.url] || ""}</main>
    <script src="/dist/index.js"></script></body></html>`);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
let failures = 0;
let passed = 0;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = expression => browser.evaluate(expression);
const frames = (count = 3) => evaluate(`new Promise(resolve => {
  let left = ${count};
  const next = () => requestAnimationFrame(() => --left ? next() : resolve());
  next();
})`);
const viewport = async width => {
  await browser.send("Emulation.setDeviceMetricsOverride", {
    width, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await frames();
};
const ready = async count => {
  for (let i = 0; i < 100; i++) {
    if (await evaluate('document.querySelectorAll("#layout > .dynFlexItem").length') === count) {
      await frames();
      return;
    }
    await wait(50);
  }
  assert.fail(`Expected ${count} initialized DynFlex items`);
};
const mount = async (attributes = "", count = 3, content) => {
  await evaluate(`document.querySelector("#host").innerHTML = ${JSON.stringify(fixture(attributes, count, content))}`);
  await ready(count);
};
const measure = () => evaluate(`(() => {
  const layout = document.querySelector("#layout");
  const box = el => {
    const r = el.getBoundingClientRect();
    return { x:r.x, y:r.y, w:r.width, h:r.height, right:r.right, bottom:r.bottom };
  };
  return {
    container: box(layout),
    gap: getComputedStyle(layout).columnGap,
    items: [...layout.querySelectorAll(":scope > .dynFlexItem")].map(item => ({
      ...box(item), inline:item.style.getPropertyValue("--w"),
      handle:box(item.querySelector(":scope > .dynFlexResizer")),
      handleDisplay:getComputedStyle(item.querySelector(":scope > .dynFlexResizer")).display,
    })),
    stored:localStorage.getItem("dynFlexWidths::attributes-layout"),
  };
})()`);
const near = (actual, expected, label, tolerance = 0.5) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} instead of ${expected}`);
const sameRow = items => items.forEach(item => near(item.y, items[0].y, "Items share one row"));
const columns = (value, count) => {
  const expected = (value.container.w - (count - 1) * parseFloat(value.gap)) / count;
  value.items.forEach(item => near(item.w, expected, `${count}-column item width`));
  sameRow(value.items.slice(0, count));
  if (value.items.length > count) {
    assert.ok(value.items[count].y > value.items[0].y, "Next item starts a second row");
    near(value.items[count].x, value.items[0].x, "Second row starts at left edge");
  }
};
const weighted = value => {
  sameRow(value.items);
  const available = value.container.w - 2 * parseFloat(value.gap);
  [0.5, 0.3, 0.2].forEach((share, i) => near(value.items[i].w, available * share, "Weighted item " + (i + 1)));
  near(value.items.at(-1).right, value.container.right, "Weighted row fills container");
};
const mouse = (type, x, y, buttons = 0) => browser.send("Input.dispatchMouseEvent", {
  type, x, y, button: "left", buttons, clickCount: 1,
});
const drag = async (index, delta, edge = "center") => {
  const value = await measure();
  const handle = value.items[index].handle;
  const x = edge === "left" ? handle.x + 1 : handle.x + handle.w / 2;
  const y = handle.y + handle.h / 2;
  await mouse("mouseMoved", x, y);
  await mouse("mousePressed", x, y, 1);
  await mouse("mouseMoved", x + delta, y, 1);
  await mouse("mouseReleased", x + delta, y);
  await frames();
};
const test = async (name, action) => {
  try {
    await action();
    passed++;
    console.log("PASS " + name);
  } catch (error) {
    failures++;
    console.error("FAIL " + name + ": " + error.message);
  }
};

try {
  browser = await openBrowser();
  await browser.send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await browser.send("Page.navigate", { url });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!document.querySelector("#lia-dynflex-style-v1-0")')) break;
    await wait(50);
  }

  await test("Default: three columns, 20px gap, 22px handles", async () => {
    await mount("", 6);
    const value = await measure();
    columns(value, 3);
    assert.equal(value.gap, "20px");
    near(value.items[0].handle.w, 22, "Default handle width");
  });

  await test("data-gap accepts bare pixels, px suffix and zero", async () => {
    for (const gap of ["36", "31px", "0"]) {
      await mount(`data-gap="${gap}"`, 4);
      const value = await measure();
      near(parseFloat(value.gap), parseFloat(gap), "Computed gap");
      near(value.items[1].x - value.items[0].right, parseFloat(gap), "Visible horizontal gap");
      near(value.items[3].y - value.items[0].bottom, parseFloat(gap), "Visible vertical gap");
      columns(value, 3);
    }
  });

  await test("data-hit changes handle geometry and real drag hit area", async () => {
    for (const hit of ["40", "48px"]) {
      await mount(`data-hit="${hit}"`);
      let value = await measure();
      near(value.items[0].handle.w, parseFloat(hit), "Configured handle width");
      const before = value.items[0].w;
      await drag(0, 50, "left");
      value = await measure();
      near(value.items[0].w, before + 50, "Drag from enlarged hit area", 0.6);
      const handle = value.items[0].handle;
      await mouse("mousePressed", handle.x - 2, handle.y + handle.h / 2, 1);
      await mouse("mouseMoved", handle.x + 30, handle.y + handle.h / 2, 1);
      await mouse("mouseReleased", handle.x + 30, handle.y + handle.h / 2);
      near((await measure()).items[0].w, value.items[0].w, "Outside hit area does not drag");
    }
  });

  await test("Explicit data-basis overrides automatic three-column initialization", async () => {
    for (const basis of ["40", "40%"]) {
      await mount(`data-basis="${basis}"`);
      const value = await measure();
      value.items.forEach(item => near(item.w, value.container.w * 0.4, "Explicit basis"));
      sameRow(value.items.slice(0, 2));
      assert.ok(value.items[2].y > value.items[0].y, "Third 40% item wraps");
    }
  });

  await test("data-min and data-max clamp real dragging", async () => {
    await mount('data-min="20%" data-max="45"');
    await drag(0, -500);
    let value = await measure();
    near(value.items[0].w, value.container.w * 0.2, "Minimum after dragging");
    await drag(0, 800);
    value = await measure();
    near(value.items[0].w, value.container.w * 0.45, "Maximum after dragging");
  });

  await test("data-columns sets 1, 2 and 5 columns and caps at child count", async () => {
    for (const count of [1, 2, 5]) {
      await mount(`data-columns="${count}"`, 6);
      columns(await measure(), count);
    }
    await mount('data-columns="5"', 2);
    columns(await measure(), 2);
  });

  await test("Invalid data-columns falls back to three columns", async () => {
    for (const count of ["0", "-2", "2.5", "abc", ""]) {
      await mount(`data-columns="${count}"`, 6);
      columns(await measure(), 3);
    }
  });

  await test("data-widths keeps 50/30/20 in one row after subtracting gaps", async () => {
    for (const widths of ["50,30,20", "50%, 30%, 20%"]) {
      await mount(`data-widths="${widths}" data-gap="30"`);
      weighted(await measure());
    }
  });

  await test("Weighted widths survive narrow layouts and widen proportionally", async () => {
    await mount('data-widths="50,30,20" data-gap="30"');
    const before = await measure();
    await viewport(390);
    const narrow = await measure();
    narrow.items.forEach(item => {
      near(item.w, narrow.container.w, "Narrow item fills container");
      assert.equal(item.handleDisplay, "none");
    });
    assert.deepEqual(narrow.items.map(item => item.inline), before.items.map(item => item.inline));
    await viewport(800);
    weighted(await measure());
    await viewport(1440);
    weighted(await measure());
  });

  await test("Weighted layout applies to LiaScript wrappers", async () => {
    await viewport(1440);
    await mount('data-widths="50,30,20"', 3,
      Array.from({ length: 3 }, (_, i) => `<article><div class="flex-child">Wrapped ${i + 1}</div></article>`).join(""));
    weighted(await measure());
  });

  await test("Invalid data-widths falls back safely to configured columns", async () => {
    for (const widths of ["50,30", "50,30,30", "50,-10,60", "50,50,0", "NaN,30,20", "50,,50", ""]) {
      await mount(`data-widths="${widths}" data-columns="2"`, 3);
      columns(await measure(), 2);
    }
  });

  await test("Initial-width priority: widths over basis over columns", async () => {
    await mount('data-widths="50,30,20" data-basis="25" data-columns="2"');
    weighted(await measure());
    await mount('data-basis="25" data-columns="2"');
    const value = await measure();
    value.items.forEach(item => near(item.w, value.container.w * 0.25, "Basis wins over columns"));
  });

  await test("Authored raw --w values retain their width and priority", async () => {
    await mount('data-widths="50,30,20" data-basis="25" data-columns="2"', 3,
      [45, 25, 15].map(width => `<div class="flex-child" style="--w:${width}%">Authored ${width}%</div>`).join(""));
    const value = await measure();
    [45, 25, 15].forEach((width, i) => near(value.items[i].w, value.container.w * width / 100, "Authored width"));
  });

  await test("Configuration changes update untouched widths and gaps", async () => {
    await mount('data-columns="2"', 6);
    columns(await measure(), 2);
    await evaluate('document.querySelector("#layout").setAttribute("data-columns", "5")');
    await frames();
    columns(await measure(), 5);
    await evaluate('document.querySelector("#layout").setAttribute("data-gap", "40")');
    await frames();
    const value = await measure();
    assert.equal(value.gap, "40px");
    columns(value, 5);
  });

  await test("Adding a child recalculates untouched initial columns", async () => {
    await mount("", 2);
    columns(await measure(), 2);
    await evaluate(`document.querySelector("#layout").insertAdjacentHTML("beforeend", ${JSON.stringify(children(1))})`);
    await ready(3);
    columns(await measure(), 3);
  });

  await test("Configuration changes preserve a manually dragged width", async () => {
    await mount('data-columns="2"', 6);
    await drag(0, -60);
    const before = (await measure()).items[0].w;
    await evaluate('document.querySelector("#layout").setAttribute("data-columns", "5")');
    await frames();
    near((await measure()).items[0].w, before, "Manual width survives column change");
  });

  await test("Default drag limits are 10% and 100%", async () => {
    await mount();
    await drag(0, -500);
    let value = await measure();
    near(value.items[0].w, value.container.w * 0.1, "Default minimum");
    await drag(0, 1200);
    value = await measure();
    near(value.items[0].w, value.container.w, "Default maximum");
  });

  await test("Stored widths override widths, basis and columns defaults", async () => {
    const saved = ["44%", "28%", "18%"];
    await evaluate(`localStorage.setItem("dynFlexWidths::attributes-priority", ${JSON.stringify(JSON.stringify(saved))})`);
    await mount('data-store="attributes-priority" data-widths="50,30,20" data-basis="25" data-columns="2"');
    const value = await measure();
    assert.deepEqual(value.items.map(item => item.inline), saved);
    saved.forEach((width, i) => near(value.items[i].w, value.container.w * parseFloat(width) / 100, "Stored width wins"));
  });

  await test("Changed and removed data-widths update untouched initial widths", async () => {
    await mount('data-widths="50,30,20" data-columns="2"');
    weighted(await measure());
    await evaluate('document.querySelector("#layout").setAttribute("data-widths", "20,30,50")');
    await frames();
    let value = await measure();
    sameRow(value.items);
    const available = value.container.w - 2 * parseFloat(value.gap);
    [0.2, 0.3, 0.5].forEach((share, i) => near(value.items[i].w, available * share, "Updated weighted width"));
    await evaluate('document.querySelector("#layout").removeAttribute("data-widths")');
    await frames();
    columns(await measure(), 2);
    await evaluate('document.querySelector("#layout").setAttribute("data-basis", "30%")');
    await frames();
    value = await measure();
    value.items.forEach(item => near(item.w, value.container.w * 0.3, "Updated basis width"));
  });

  await test("Automatic widths remain configurable after wrapper replacement", async () => {
    await mount('data-columns="2"', 4,
      Array.from({ length: 4 }, (_, i) => `<article><div class="flex-child">Original wrapper ${i + 1}</div></article>`).join(""));
    columns(await measure(), 2);
    const replacement = Array.from({ length: 4 }, (_, i) =>
      `<section><div class="flex-child">Replacement wrapper ${i + 1}</div></section>`).join("");
    await evaluate(`document.querySelector("#layout").innerHTML = ${JSON.stringify(replacement)}`);
    await ready(4);
    columns(await measure(), 2);
    await evaluate('document.querySelector("#layout").setAttribute("data-columns", "3")');
    await frames();
    columns(await measure(), 3);
  });

  await test("data-min=0 persists and restores a zero-percent drag", async () => {
    await browser.send("Page.navigate", { url: url + "/storage-zero" });
    await ready(3);
    await drag(0, -500);
    const value = await measure();
    assert.equal(parseFloat(value.items[0].inline), 0, "Dragging reaches the configured zero minimum");
    const saved = await evaluate('localStorage.getItem("dynFlexWidths::attributes-zero")');
    assert.equal(JSON.parse(saved)[0], value.items[0].inline, "Zero percent is saved");
    await browser.send("Page.reload");
    await ready(3);
    const restored = await measure();
    assert.equal(restored.items[0].inline, value.items[0].inline, "Reload preserves zero percent instead of substituting a default");
    assert.equal(await evaluate('localStorage.getItem("dynFlexWidths::attributes-zero")'), saved);
  });

  await test("Persisting fractional widths does not wrap a full 999px row", async () => {
    await browser.send("Page.navigate", { url: url + "/storage-rounding" });
    await ready(3);
    const initial = await measure();
    near(initial.container.w, 999, "Rounding fixture width");
    sameRow(initial.items);
    await drag(0, -0.01);
    const changed = await measure();
    sameRow(changed.items);
    assert.ok(changed.items[0].w <= initial.items[0].w + 0.02, "Tiny drag does not enlarge the first card");
    const saved = JSON.parse(await evaluate('localStorage.getItem("dynFlexWidths::attributes-rounding")'));
    assert.equal(saved.length, 3);
    await browser.send("Page.reload");
    await ready(3);
    const restored = await measure();
    sameRow(restored.items);
    assert.deepEqual(restored.items.map(item => item.inline), saved, "Reload preserves serialized fractional widths");
  });

  await test("data-store saves dragged widths and restores them on reload", async () => {
    await browser.send("Page.navigate", { url: url + "/storage" });
    await ready(4);
    columns(await measure(), 3);
    assert.equal((await measure()).stored, null, "Initial visit does not persist defaults");
    await drag(0, -70);
    const value = await measure();
    const saved = JSON.parse(value.stored);
    assert.equal(saved.length, 4);
    saved.forEach(width => assert.match(width, /^\d+(\.\d+)?%$/));
    await browser.send("Page.reload");
    await ready(4);
    const restored = await measure();
    assert.equal(restored.stored, value.stored);
    assert.deepEqual(restored.items.map(item => item.inline), saved);
    restored.items.forEach((item, i) => near(item.w, value.items[i].w, "Reload restores dragged geometry"));
    await viewport(390);
    const narrow = await measure();
    narrow.items.forEach(item => near(item.w, narrow.container.w, "Stored layout still stacks on mobile"));
    assert.equal(narrow.stored, value.stored, "Responsive mode does not replace stored widths");
    await viewport(1440);
    assert.deepEqual((await measure()).items.map(item => item.inline), saved);
  });

  await test("Child data-start-width changes only its own raw percentage", async () => {
    for (const width of ["50", "50%"]) {
      await mount("", 4,
        `<div class="flex-child" data-start-width="${width}"><div style="height:70px">Outlier</div></div>` + children(3));
      const value = await measure();
      near(value.items[0].w, value.container.w * 0.5, "Individual raw percentage");
      const defaultWidth = (value.container.w - 2 * parseFloat(value.gap)) / 3;
      value.items.slice(1).forEach(item => near(item.w, defaultWidth, "Unconfigured child retains default width"));
      assert.ok(value.items[2].y > value.items[0].y, "Items wrap normally instead of redistributing remaining space");
    }
  });

  await test("Individual start width overrides container defaults but preserves inline --w", async () => {
    for (const attributes of ['data-widths="50,30,20"', 'data-basis="25"', 'data-columns="2"']) {
      await mount(attributes, 3,
        '<div class="flex-child" data-start-width="40">Individual</div>' + children(2));
      const value = await measure();
      near(value.items[0].w, value.container.w * 0.4, "Individual width wins over container configuration");
      const expected = attributes.includes("data-widths")
        ? (value.container.w - 2 * parseFloat(value.gap)) * 0.3
        : attributes.includes("data-basis") ? value.container.w * 0.25 : (value.container.w - parseFloat(value.gap)) / 2;
      near(value.items[1].w, expected, "Container default still applies to other children");
    }
    await mount('data-widths="50,30,20"', 3,
      '<div class="flex-child" data-start-width="40" style="--w:45%">Authored width</div>' + children(2));
    const value = await measure();
    near(value.items[0].w, value.container.w * 0.45, "Inline --w wins over individual default");
  });

  await test("Individual start width supports LiaScript wrappers without nested leakage", async () => {
    await mount("", 3,
      '<article><div class="flex-child" data-start-width="50%">Wrapped outlier</div></article>' +
      '<article><div class="flex-child">Wrapped B</div></article>' +
      '<article><div class="flex-child">Wrapped C</div></article>');
    let value = await measure();
    near(value.items[0].w, value.container.w * 0.5, "Child attribute sizes its direct wrapper");
    await mount("", 2,
      '<article><div class="flex-child">Outer default<section class="dynFlex"><div class="flex-child" data-start-width="80">Inner outlier</div></section></div></article>' +
      '<article><div class="flex-child">Outer sibling</div></article>');
    value = await measure();
    columns(value, 2);
  });

  await test("Invalid individual start widths fall back to normal defaults", async () => {
    for (const width of ["0", "-5", "101", "abc", "", "50px"]) {
      await mount("", 3,
        `<div class="flex-child" data-start-width="${width}">Invalid outlier</div>` + children(2));
      columns(await measure(), 3);
    }
    for (const width of ["5", "100%"]) {
      await mount("", 3,
        `<div class="flex-child" data-start-width="${width}">Valid outlier</div>` + children(2));
      const value = await measure();
      near(value.items[0].w, value.container.w * parseFloat(width) / 100, "Valid individual width is independent of drag limits");
    }
  });

  await test("Changing and removing an untouched child start width updates its wrapper", async () => {
    await mount("", 3,
      '<article><div id="outlier" class="flex-child" data-start-width="50">Wrapped outlier</div></article>' +
      '<article><div class="flex-child">Wrapped B</div></article>' +
      '<article><div class="flex-child">Wrapped C</div></article>');
    await evaluate('document.querySelector("#outlier").setAttribute("data-start-width", "40%")');
    await frames();
    let value = await measure();
    near(value.items[0].w, value.container.w * 0.4, "Changed child attribute updates the direct wrapper");
    await evaluate('document.querySelector("#outlier").removeAttribute("data-start-width")');
    await frames();
    columns(await measure(), 3);
    await evaluate('document.querySelector("#outlier").setAttribute("data-start-width", "20")');
    await frames();
    value = await measure();
    near(value.items[0].w, value.container.w * 0.2, "Added child attribute replaces the initial default");
  });

  await test("Dragging an individual-width child takes priority over later attribute changes", async () => {
    await mount("", 3,
      '<div id="outlier" class="flex-child" data-start-width="50"><div style="height:70px">Outlier</div></div>' + children(2));
    const initial = await measure();
    await drag(0, -60);
    const changed = await measure();
    near(changed.items[0].w, initial.items[0].w - 60, "Individual-width child remains draggable");
    await evaluate('document.querySelector("#outlier").setAttribute("data-start-width", "20%")');
    await frames();
    near((await measure()).items[0].w, changed.items[0].w, "Dragged width wins over changed individual default");
    await evaluate('document.querySelector("#outlier").removeAttribute("data-start-width")');
    await frames();
    near((await measure()).items[0].w, changed.items[0].w, "Dragged width survives removal of individual default");
  });

  await test("Stored widths take priority over individual child start widths", async () => {
    const saved = ["44%", "28%", "18%"];
    await evaluate(`localStorage.setItem("dynFlexWidths::attributes-child-priority", ${JSON.stringify(JSON.stringify(saved))})`);
    await mount('data-store="attributes-child-priority" data-widths="50,30,20"', 3,
      '<div id="outlier" class="flex-child" data-start-width="60">Individual default</div>' + children(2));
    assert.deepEqual((await measure()).items.map(item => item.inline), saved);
    await evaluate('document.querySelector("#outlier").setAttribute("data-start-width", "70%")');
    await frames();
    assert.deepEqual((await measure()).items.map(item => item.inline), saved, "Stored widths survive individual default changes");
  });

  await test("Individual child widths stack on mobile and return when widened", async () => {
    await mount("", 3,
      '<div class="flex-child" data-start-width="50%">Individual default</div>' + children(2));
    const initial = await measure();
    near(initial.items[0].w, initial.container.w * 0.5, "Initial individual width");
    await viewport(390);
    const narrow = await measure();
    narrow.items.forEach(item => {
      near(item.w, narrow.container.w, "Individual widths respect narrow layout");
      assert.equal(item.handleDisplay, "none");
    });
    await viewport(1440);
    const restored = await measure();
    restored.items.forEach((item, i) => near(item.w, initial.items[i].w, "Widening restores configured and default widths"));
  });

  console.log(`Attributes regression: ${passed} passed, ${failures} failed`);
  if (failures) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
