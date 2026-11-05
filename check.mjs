// Layout and accessibility check for every example page: node check.mjs (Node 22+, Chrome; CHROME=… to override).
// Loads each page in each design, theme and width (and the open burger menu on phones) and fails on:
//   layout: horizontal page scroll, elements sticking out of the viewport, one-line components that wrap, clipped text
//   a11y:   text contrast < 4.5:1 (3:1 large), state graphics and form field edges < 3:1, missing accessible names,
//           labels or alt, duplicate ids, missing lang/title/main/h1, targets < 24×24 px without spacing, no focus indicator
// No dependencies: Chrome DevTools protocol over Node's built-in WebSocket.
import {spawn} from 'node:child_process';
import {existsSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const pages = ['index', 'list', 'detail', 'form', 'dates', 'week', 'month', 'settings', 'status', 'login'];
const designs = ['', 'nordic'], themes = ['light', 'dark'], widths = [320, 390, 768, 1280];
const chrome = process.env.CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if (!chrome) { console.error('Chrome not found, set CHROME'); process.exit(2); }

const port = 9400 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', '--force-prefers-reduced-motion', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nbui-'))}`, 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method: 'PUT'}).then(r => r.json()).catch(() => null); }
if (!target) { console.error('Chrome did not start'); proc.kill(); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const pend = {}, loads = [];
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id) pend[d.id]?.(d); else if (d.method === 'Page.loadEventFired') loads.splice(0).forEach(f => f()); };
const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
const evaluate = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
await cmd('Page.enable');
await cmd('Emulation.setFocusEmulationEnabled', {enabled: true}); // a background page has no focus otherwise

// runs inside the page; returns a list of problems
const probe = () => {
  const P = [], W = innerWidth, de = document.documentElement;
  const nm = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const path = el => { const a = []; for (let e = el; e && e !== document.body && a.length < 3; e = e.parentElement) a.unshift(nm(e)); return a.join(' > '); };
  const shown = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('#demo, dialog:not([open]), [hidden], details:not([open]) > :not(summary)'); };
  const clips = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).overflowX !== 'visible') return e; return null; };
  const add = (kind, msg, el) => P.push(`${kind}: ${msg}${el ? ' — ' + path(el) : ''}`);
  const all = [...document.body.querySelectorAll('*')].filter(shown);

  // ---- layout ----
  if (de.scrollWidth > W + 1) add('layout', `page scrolls sideways (${de.scrollWidth} > ${W} px)`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !clips(el) && !(el.parentElement && (el.parentElement.getBoundingClientRect().right > W + 1)) && getComputedStyle(el).position !== 'fixed')
      add('layout', `sticks out of the viewport (${Math.round(r.left)}…${Math.round(r.right)} of ${W})`, el);
  }
  const lines = el => { // height of the text box versus one line
    const range = document.createRange(); range.selectNodeContents(el);
    const rs = [...range.getClientRects()].filter(r => r.width && r.height);
    if (!rs.length) return 1;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2;
    return (Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top))) / lh;
  };
  const oneLine = 'button, .btn, .chip, .tag, kbd, nav.app a, .tabs a, th, .seg label, .pager a, .logo, .who, td.num, .st, .results .sub, .calhead .btn, .cal .hd b, .month .c > span:first-child, .dayhead b, .foot b';
  for (const el of all.filter(e => e.matches(oneLine))) if (lines(el) > 1.6) add('layout', `wraps onto ${Math.round(lines(el))} lines: "${el.textContent.trim().slice(0, 30)}"`, el);
  for (const el of all) { // clipped text without an ellipsis (calendar entries clip by design)
    const s = getComputedStyle(el);
    if (s.overflowX === 'hidden' && s.clipPath === 'none' && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis' && !el.closest('.ev, .stack') && el.textContent.trim())
      add('layout', `clips its text (${el.scrollWidth} > ${el.clientWidth} px)`, el);
  }

  // ---- accessibility ----
  const rgb = c => { // rgb()/rgba() in 0–255, color(srgb …) in 0–1 (what color-mix computes to)
    const m = c.match(/[\d.]+/g); if (!m) return {r: 0, g: 0, b: 0, a: 0};
    const k = c.startsWith('color(') ? 255 : 1;
    return {r: m[0] * k, g: m[1] * k, b: m[2] * k, a: m[3] === undefined ? 1 : +m[3]};
  };
  const over = (f, b) => ({r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1});
  const bgOf = el => { // composited background behind el
    const stack = [];
    for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.a) stack.push(c); if (c.a === 1) break; }
    let c = rgb(getComputedStyle(document.body).backgroundColor); if (c.a < 1) c = over(c, rgb(getComputedStyle(de).backgroundColor));
    if (!c.a) c = {r: 255, g: 255, b: 255, a: 1};
    for (const s of stack.reverse()) c = over(s, c);
    return c;
  };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const faded = el => { for (let e = el; e; e = e.parentElement) if (+getComputedStyle(e).opacity < 1) return true; return false; };
  // text contrast: every element with its own text
  for (const el of all) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || el.closest(':disabled, [aria-disabled=true], .mark, svg, option') || faded(el)) continue;
    const s = getComputedStyle(el), fg = rgb(s.color), bg = bgOf(el), size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5, r = ratio(over(fg, bg), bg);
    if (r < need - .005) add('a11y', `text contrast ${r.toFixed(2)}:1 < ${need}:1 "${el.textContent.trim().slice(0, 24)}"`, el);
  }
  for (const el of document.querySelectorAll('input[placeholder]:placeholder-shown')) {
    if (!shown(el)) continue;
    const r = ratio(over(rgb(getComputedStyle(el, '::placeholder').color), bgOf(el)), bgOf(el));
    if (r < 4.5 - .005) add('a11y', `placeholder contrast ${r.toFixed(2)}:1 < 4.5:1`, el);
  }
  // state graphics 3:1 (a rim counts), field edges 3:1 (border or fill)
  for (const el of all.filter(e => e.matches('.dot, .st, .bar, .stack i'))) {
    const s = getComputedStyle(el), bg = bgOf(el.parentElement), rim = s.boxShadow.match(/(rgba?|color)\([^)]*\)/)?.[0];
    const c = el.matches('.st') ? rgb(s.color) : rgb(rim && rgb(rim).a ? rim : s.backgroundColor);
    if (c.a && ratio(over(c, bg), bg) < 3 - .005) add('a11y', `state graphic contrast ${ratio(over(c, bg), bg).toFixed(2)}:1 < 3:1`, el);
  }
  for (const el of all.filter(e => e.matches('input:not([type=checkbox]):not([type=radio]):not([type=color]):not([type=hidden]), select, textarea') && !e.closest('dialog.palette'))) {
    const s = getComputedStyle(el), bg = bgOf(el.parentElement), edge = Math.max(ratio(over(rgb(s.borderBottomColor), bg), bg), ratio(over(rgb(s.backgroundColor), bg), bg));
    if (+s.borderBottomWidth > 0 && edge < 3 - .005) add('a11y', `field edge contrast ${edge.toFixed(2)}:1 < 3:1`, el);
  }
  // names, labels, alt, ids, landmarks
  const named = el => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.title || el.labels?.length || el.alt ||
    [...el.childNodes].some(n => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && n.tagName !== 'KBD' && (n.textContent.trim() || n.alt))));
  for (const el of document.querySelectorAll('a[href], button, summary, input:not([type=hidden]), select, textarea'))
    if (!el.closest('[hidden]') && !named(el)) add('a11y', 'no accessible name', el);
  for (const el of document.querySelectorAll('img:not([alt])')) add('a11y', 'img without alt', el);
  const ids = {}; for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [k, n] of Object.entries(ids)) if (n > 1) add('a11y', `duplicate id #${k} (${n}×)`);
  if (!de.lang) add('a11y', 'html without lang');
  if (!document.title.trim()) add('a11y', 'empty title');
  if (document.querySelectorAll('main').length !== 1) add('a11y', `${document.querySelectorAll('main').length} <main> elements`);
  if (document.querySelectorAll('main h1').length !== 1) add('a11y', `${document.querySelectorAll('main h1').length} h1 in main`);
  // targets: at least 24×24, or nothing else within 12 px of the centre (WCAG 2.5.8); links inside text are exempt
  const targets = all.filter(e => e.matches('button, .btn, .chip, nav a, .tabs a, summary, select, input:not([type=hidden]), .pager a, .logo, header.app .right a, .tag') && !e.closest('p, li:not(.card), .info, td:not(.num), .menu'));
  const box = el => (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) ? el.closest('label').getBoundingClientRect() : el.getBoundingClientRect();
  for (const el of targets) {
    const r = box(el);
    if (r.width >= 24 - .5 && r.height >= 24 - .5) continue;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const near = targets.find(o => { if (o === el || o.contains(el) || el.contains(o)) return false; const q = box(o); const dx = Math.max(q.left - cx, 0, cx - q.right), dy = Math.max(q.top - cy, 0, cy - q.bottom); return Math.hypot(dx, dy) < 12; });
    if (near) add('a11y', `target ${Math.round(r.width)}×${Math.round(r.height)} px, too close to ${nm(near)}`, el);
  }
  return P;
};

// focus indicator: focus each kind of control once and compare its outline, shadow and border
const focusProbe = () => {
  const P = [], seen = new Set();
  for (const el of document.querySelectorAll('main a[href], main button, main summary, main input, main select, main textarea, header a, header button, header input')) {
    const kind = el.tagName + '.' + el.className + '.' + el.type;
    if (seen.has(kind) || !el.getClientRects().length || el.closest('[hidden], dialog:not([open])')) continue;
    seen.add(kind);
    if (document.activeElement === el) el.blur();
    const before = getComputedStyle(el), b = [before.outlineStyle, before.boxShadow, before.borderColor, before.backgroundColor].join();
    el.focus({focusVisible: true});
    const after = getComputedStyle(el), a = [after.outlineStyle, after.boxShadow, after.borderColor, after.backgroundColor].join();
    if (document.activeElement === el && a === b) P.push(`a11y: no visible focus — ${el.tagName.toLowerCase()}.${el.className}`);
    el.blur();
  }
  return P;
};

const base = pathToFileURL(resolve('examples')).href + '/';
let failed = 0, runs = 0;
const seen = new Map();
for (const design of designs) for (const theme of themes) for (const w of widths) {
  await cmd('Emulation.setDeviceMetricsOverride', {width: w, height: 900, deviceScaleFactor: 1, mobile: w < 640});
  for (const p of pages) {
    const variants = [{}];
    if (w < 640 && !['status', 'login'].includes(p)) variants.push({menu: true});
    if (w === 320 && p === 'list') variants.push({logo: true});
    for (const v of variants) {
      const loaded = new Promise(r => loads.push(r));
      await cmd('Page.navigate', {url: `${base}${p}.html?nopanel&design=${design}&brand=&logo=${v.logo ? 1 : ''}&theme=${theme}`});
      await loaded; await sleep(150);
      if (v.menu) await evaluate(`document.getElementById('menu')?.click()`);
      const problems = await evaluate(`(${probe})()`);
      if (!v.menu && !v.logo && w === 1280) problems.push(...await evaluate(`(${focusProbe})()`));
      runs++;
      const where = `${p} ${design || 'plain'} ${theme} ${w}px${v.menu ? ' menu' : ''}${v.logo ? ' logo' : ''}`;
      for (const msg of problems) { // group identical problems across variants
        if (!seen.has(msg)) seen.set(msg, []);
        seen.get(msg).push(where);
        failed++;
      }
    }
  }
}
for (const [msg, where] of seen) console.log(`✕ ${msg}\n    ${where.length > 3 ? where.slice(0, 3).join(', ') + ` … (${where.length}×)` : where.join(', ')}`);
console.log(`${runs} page loads, ${seen.size} distinct problems`);
ws.close(); proc.kill();
process.exit(seen.size ? 1 : 0);
