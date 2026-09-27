import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";

const browserPath = process.env.DYNFLEX_BROWSER || (process.platform === "win32"
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : "chromium");

export async function openBrowser() {
  const profile = await mkdtemp(join(tmpdir(), "dynflex-cdp-"));
  const browser = spawn(browserPath, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    "--no-default-browser-check", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  let port;
  for (let i = 0; i < 100; i++) {
    try {
      port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
      if (port) break;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!port) throw new Error("Browser did not start");

  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const p = pending.get(message.id);
      if (!p) return;
      pending.delete(message.id);
      if (message.error) p.reject(new Error(JSON.stringify(message.error)));
      else p.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) || []) {
      Promise.resolve(listener(message.params)).catch(() => {});
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const on = (method, listener) => {
    const handlers = listeners.get(method) || new Set();
    handlers.add(listener);
    listeners.set(method, handlers);
    return () => handlers.delete(listener);
  };
  const close = async () => {
    try { await send("Page.close"); } catch (_) {}
    ws.close();
    browser.kill();
    if (profile.startsWith(tmpdir() + sep)) {
      try { await rm(profile, { recursive: true, force: true }); } catch (_) {}
    }
  };
  await send("Page.enable");
  await send("Runtime.enable");
  return { send, evaluate, on, close };
}
