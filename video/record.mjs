// Records the typed UI demo: node video/record.mjs <frames dir>, then go run ./video/encode <frames dir> video/demo.gif.
// Headless Chrome over the DevTools protocol with Node's own WebSocket (no npm, nomail-skill style): Page.startScreencast
// frames with timestamps, a caption bar and a visible cursor injected into every page, mouse and keys at human pace.
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const out = process.argv[2] || join(tmpdir(), 'nbui-frames');
mkdirSync(out, {recursive: true});
const root = resolve(import.meta.dirname, '..');
const url = p => { const [path, rest = ''] = p.split(/(?=[?#])/); return pathToFileURL(join(root, path)).href + rest; };
const chrome = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const W = 1280, H = 720, port = 9900 + Math.floor(Math.random() * 90);
const proc = spawn(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nbui-rec-'))}`, `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 100 && !target; i++) { await sleep(200); target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: 'PUT'}).then(r => r.json()).catch(() => null); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map(), on = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { wait.get(m.id)?.(m); wait.delete(m.id); } else on[m.method]?.(m.params); };
const cmd = (method, params = {}) => new Promise((ok, no) => { const i = ++id; wait.set(i, m => m.error ? no(new Error(method + ': ' + m.error.message)) : ok(m.result)); ws.send(JSON.stringify({id: i, method, params})); });

// overlay: a caption bar at the bottom and a cursor that follows the mouse; window.__cap(text) sets the caption
const overlay = `if (window === top) addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style'); s.textContent = '#__cap{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:12px 24px;background:rgba(24,25,27,.92);color:#f6f6f5;font:600 18px/1.4 ui-monospace,Consolas,monospace;text-align:center}#__cap:empty{display:none}#__cur{position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(220,38,38,.55);border:2px solid #fff;pointer-events:none;left:-40px;top:-40px;transition:transform .1s}#__cur.down{transform:scale(.7)}body:has(.card,.code,.phone) #__cur{display:none}';
  document.head.append(s);
  const c = document.createElement('div'); c.id = '__cap'; c.textContent = sessionStorage.getItem('__cap') || ''; document.body.append(c);
  const k = document.createElement('div'); k.id = '__cur'; document.body.append(k);
  const p = JSON.parse(sessionStorage.getItem('__xy') || '[-40,-40]'); k.style.left = p[0] + 'px'; k.style.top = p[1] + 'px';
  addEventListener('mousemove', e => { k.style.left = e.clientX + 'px'; k.style.top = e.clientY + 'px'; sessionStorage.setItem('__xy', JSON.stringify([e.clientX, e.clientY])); }, true);
  addEventListener('mousedown', () => k.classList.add('down'), true); addEventListener('mouseup', () => k.classList.remove('down'), true);
  window.__cap = t => { sessionStorage.setItem('__cap', t); c.textContent = t; };
});`;

let n = 0;
on['Page.screencastFrame'] = p => {
  writeFileSync(join(out, `${String(n++).padStart(5, '0')}-${Math.round(p.metadata.timestamp * 1000)}.jpg`), Buffer.from(p.data, 'base64'));
  cmd('Page.screencastFrameAck', {sessionId: p.sessionId}).catch(() => {});
};
await cmd('Page.enable'); await cmd('Runtime.enable');
await cmd('Page.addScriptToEvaluateOnNewDocument', {source: overlay});
const size = (w, h) => cmd('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: w < 600});
await size(W, H);
await cmd('Page.startScreencast', {format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H});

const js = async expr => (await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true})).result.value;
let xy = [W / 2, H / 2];
const go = async (path, caption = '') => {
  const loaded = new Promise(r => on['Page.loadEventFired'] = r);
  await js(`try { sessionStorage.setItem('__cap', ${JSON.stringify(caption)}) } catch {}`).catch(() => {});
  await cmd('Page.navigate', {url: url(path)}); await loaded; await sleep(150);
  await js(`window.__cap && __cap(${JSON.stringify(caption)})`);
  await js(`document.getElementById('__cur') && (document.getElementById('__cur').style.left='${xy[0]}px', document.getElementById('__cur').style.top='${xy[1]}px')`);
};
const caption = t => js(`__cap(${JSON.stringify(t)})`);
const box = sel => js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({block: 'center'}); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
const move = async ([x, y]) => { // a straight line in 12 steps, like a hand
  for (let i = 1; i <= 12; i++) { await cmd('Input.dispatchMouseEvent', {type: 'mouseMoved', x: xy[0] + (x - xy[0]) * i / 12, y: xy[1] + (y - xy[1]) * i / 12}); await sleep(25); }
  xy = [x, y];
};
const click = async sel => {
  await move(await box(sel)); await sleep(200);
  for (const type of ['mousePressed', 'mouseReleased']) { await cmd('Input.dispatchMouseEvent', {type, x: xy[0], y: xy[1], button: 'left', clickCount: 1}); await sleep(80); }
};
const type = async text => { for (const ch of text) { await cmd('Input.insertText', {text: ch}); await sleep(90); } };
const key = async (k, code, mods = 0, vk = 0) => {
  for (const t of ['rawKeyDown', 'keyUp']) await cmd('Input.dispatchKeyEvent', {type: t, key: k, code, modifiers: mods, windowsVirtualKeyCode: vk});
};
const done = () => js(`new Promise(r => { const t = setInterval(() => { if (document.body.dataset.done !== undefined) { clearInterval(t); r(true); } }, 50); })`);

// the story
await go('video/slides.html?title'); await sleep(3000);
await go('video/slides.html?code'); await done(); await sleep(3500);

await go('screens/auth/login-wrong.html', 'ui renders it: the error sits at its field, linked for screen readers');
await sleep(1200); await click('input[name=password]'); await type('correct horse'); await sleep(1500);
await go('screens/auth/setup.html', 'Every auth screen is a Go value: the second step, with its QR code'); await sleep(2500);
await go('screens/auth/users.html', 'Lists: filter chips, a sortable table, a pager'); await sleep(800);
await move(await box('tbody tr:nth-child(2) a')); await sleep(1800);
await go('screens/auth/user.html', 'Menus are native popovers: no script'); await sleep(800);
await click('button[popovertarget=nb-more]'); await sleep(2200); await key('Escape', 'Escape', 0, 27); await sleep(400);

await go('blocks.html#st-w', 'Behaviour with settings is a custom element: <nb-editable> saves on its own');
await sleep(600); await click('#st-w nb-editable[label="Reminder after"] button'); await sleep(400);
await key('a', 'KeyA', 2, 65); await type('21'); await sleep(300); await key('Enter', 'Enter', 0, 13); await sleep(3200);

await go('showcase/sample/dashboard.html', 'An app page: header, nav, stat tiles, cards. Ctrl K opens the commands'); await sleep(1500);
await key('k', 'KeyK', 2, 75); await sleep(700); await type('inv'); await sleep(1500); await key('Escape', 'Escape', 0, 27); await sleep(300);
await cmd('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: 'dark'}]});
await caption('Light and dark come from the same tokens'); await sleep(2500);
await cmd('Emulation.setEmulatedMedia', {features: []});
await go('video/phone.html?../screens/auth/account.html', 'Phones: the same page, one column'); await sleep(3000);

await go('video/slides.html?rules'); await done(); await sleep(3500);
await go('video/slides.html?copy'); await done(); await sleep(3500);
await go('video/slides.html?other'); await done(); await sleep(3500);
await go('video/slides.html?end'); await sleep(3000);
await cmd('Page.stopScreencast'); await sleep(300);
console.log(`${n} frames in ${out}`);
ws.close(); proc.kill();
