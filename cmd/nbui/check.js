// The checks nbui check runs inside each page, in Chrome and Firefox (cmd/nbui/check.go evaluates one method at a time).
// Rules: skill/design-system.md (Layout, Accessibility, Screen readers, Icons).
({
// returns a list of problems; specimens: a design system page that shows several whole pages or page heads (blocks, shell,
// documents); ownPage: a design system page (no app frame, so no skip link)
probe: (specimens, ownPage) => {
  const P = [], de = document.documentElement, W = de.clientWidth; // not innerWidth: a phone (Chrome's mobile emulation) widens it to fit what overflows
  const nm = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const path = el => { const a = []; for (let e = el; e && e !== document.body && a.length < 3; e = e.parentElement) a.unshift(nm(e)); return a.join(' > '); };
  const offscreen = el => { for (let e = el; e; e = e.parentElement) if (getComputedStyle(e).clipPath === 'inset(50%)') return true; return el.closest('[aria-hidden="true"]') && el.tabIndex < 0; };
  const shown = el => { if (offscreen(el)) return false; const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('#demo, dialog:not([open]), [hidden], details:not([open]) > :not(summary)'); };
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
    const rs = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      let out = false; for (let e = n.parentElement; e && e !== el; e = e.parentElement) if (getComputedStyle(e).position === 'absolute') out = true;
      if (out) continue;
      const range = document.createRange(); range.selectNodeContents(n); rs.push(...[...range.getClientRects()].filter(r => r.width && r.height));
    }
    if (!rs.length) return 1;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2;
    return (Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top))) / lh;
  };
  const oneLine = 'button, .btn, .button, .chip, .tag, kbd, nav.app a, .tabs a, th, .seg label, .pager a, .logo, .who, td.num, .st, .results .sub, .calhead .btn, .cal .hd b, .month .c > span:first-child, .dayhead b, .foot b';
  for (const el of all.filter(e => e.matches(oneLine) && !e.matches('.ic-c') && !e.querySelector('.avatar') && parseFloat(getComputedStyle(e).fontSize) > 0)) // font-size 0: icon-only on purpose
  if (lines(el) > 1.6) add('layout', `wraps onto ${Math.round(lines(el))} lines: "${el.textContent.trim().slice(0, 30)}"`, el);
  for (const el of all) { // clipped text without an ellipsis (calendar entries clip by design)
    const s = getComputedStyle(el);
    if (s.overflowX === 'hidden' && s.clipPath === 'none' && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis' && !el.closest('.ev, .stack') && el.textContent.trim())
      add('layout', `clips its text (${el.scrollWidth} > ${el.clientWidth} px)`, el);
  }

  // ---- accessibility ----
  const cx2d = Object.assign(document.createElement('canvas'), {width: 1, height: 1}).getContext('2d', {willReadFrequently: true});
  const rgb = c => { // any computed colour (rgb, color(srgb), oklab, oklch …) to sRGB 0–255 through a canvas pixel
    cx2d.clearRect(0, 0, 1, 1); cx2d.fillStyle = 'transparent'; cx2d.fillStyle = c; cx2d.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx2d.getImageData(0, 0, 1, 1).data;
    return {r, g, b, a: a / 255};
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
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || el.closest(':disabled, [aria-disabled=true], .mark, svg, option, progress') || faded(el)) continue;
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
  for (const el of all.filter(e => e.matches('.dot, .st, .bar, .stack i, .bars .b, .meter i, .chart .col path'))) {
    const s = getComputedStyle(el), bg = bgOf(el.parentElement), rim = s.boxShadow.match(/(rgba?|color|oklab|oklch|lab|lch)\([^)]*\)/)?.[0];
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
    if (!el.closest('[hidden]') && !(el.closest('[aria-hidden="true"]') && el.tabIndex < 0) && !named(el)) add('a11y', 'no accessible name', el);
  // every button, .btn, tab, pager link, chip and menu item has an icon: <i class="icon-…"> or a class that draws one (::before)
  const drawn = el => { const b = getComputedStyle(el, '::before'); return b.content !== 'none' && (b.maskImage || b.webkitMaskImage || 'none') !== 'none'; };
  const closedDlg = [...document.querySelectorAll('dialog:not([open]):not(.palette) :is(button, .btn)')]; // a closed dialog's buttons count too
  for (const el of [...new Set([...all, ...closedDlg])].filter(e => e.matches('button, .btn, .button, summary.round, .tabs a, .pager a, a.chip, :is(.menu, .umenu) a') && !e.closest('dialog.palette, [hidden]:not(dialog)')))
    if (!el.matches('[class*="icon-"]') && !el.querySelector('[class*="icon-"], .avatar') && !drawn(el)) add('icon', `no icon: "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}"`, el);
  for (const el of document.querySelectorAll('img:not([alt])')) add('a11y', 'img without alt', el);
  const ids = {}; for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [k, n] of Object.entries(ids)) if (n > 1) add('a11y', `duplicate id #${k} (${n}×)`);
  if (!de.lang) add('a11y', 'html without lang');
  if (!document.title.trim()) add('a11y', 'empty title');
  if (document.querySelectorAll('main').length !== 1) add('a11y', `${document.querySelectorAll('main').length} <main> elements`);
  if (!specimens && document.querySelectorAll('main h1').length !== 1) add('a11y', `${document.querySelectorAll('main h1').length} h1 in main`);
  // targets: at least 24×24, or nothing else within 12 px of the centre (WCAG 2.5.8); links inside text are exempt
  const targets = all.filter(e => e.matches('button, .btn, .button, .chip, nav a, .tabs a, summary, select, input:not([type=hidden]):not(.sr), .pager a, .logo, header.app .right a, .tag') && !e.closest('p, li:not(.card), .info, td:not(.num), .menu'));
  const box = el => (el.matches('input[type=checkbox], input[type=radio], input[type=file]') && el.closest('label')) ? el.closest('label').getBoundingClientRect() : el.getBoundingClientRect();
  for (const el of targets) {
    const r = box(el);
    if (r.width >= 24 - .5 && r.height >= 24 - .5) continue;
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    const near = targets.find(o => { if (o === el || o.contains(el) || el.contains(o)) return false; const q = box(o); const dx = Math.max(q.left - cx, 0, cx - q.right), dy = Math.max(q.top - cy, 0, cy - q.bottom); return Math.hypot(dx, dy) < 12; });
    if (near) add('a11y', `target ${Math.round(r.width)}×${Math.round(r.height)} px, too close to ${nm(near)}`, el);
  }

  // ---- screen readers (design-system.md → Accessibility → Screen readers) ----
  for (const el of all.filter(e => e.matches('.message'))) { const want = el.dataset.state === 'danger' ? 'alert' : 'status'; if (el.getAttribute('role') !== want) add('sr', `message without role="${want}"`, el); }
  for (const el of document.querySelectorAll('[aria-invalid="true"]'))
    if (!(el.getAttribute('aria-describedby') || '').split(/\s+/).some(i => i && document.getElementById(i))) add('sr', 'aria-invalid without aria-describedby pointing to its error', el);
  for (const el of all.filter(e => e.matches('.field-error, .err')))
    if (!el.id || !document.querySelector(`[aria-describedby~="${CSS.escape(el.id)}"]`)) add('sr', 'field error not named by its field (aria-describedby)', el);
  for (const el of document.querySelectorAll('i[class*="icon-"]'))
    if (el.getAttribute('aria-hidden') !== 'true' && !(el.getAttribute('role') === 'img' && el.getAttribute('aria-label'))) add('sr', 'icon neither aria-hidden="true" nor role="img" with aria-label', el);
  const focusable = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]';
  for (const h of document.querySelectorAll('[aria-hidden="true"]'))
    for (const el of [h, ...h.querySelectorAll(focusable)]) if (el.matches(focusable) && el.tabIndex >= 0 && !el.disabled) add('sr', 'focusable inside aria-hidden', el);
  // a nav marks the entry that is this page (crumbs: always the last one); never more than one; in-page tables of contents have none
  const url = u => u.split(/[?#]/)[0];
  for (const n of all.filter(e => e.matches('nav') && e.querySelector('a[href]'))) {
    const cur = n.querySelectorAll('[aria-current]:not([aria-current="false"])').length;
    const here = [...n.querySelectorAll('a[href]:not([href^="#"], [rel])')].some(a => url(a.href) === url(location.href)) || n.matches('.breadcrumbs, [aria-label="Breadcrumbs"]');
    if (cur > 1 || (here && cur !== 1)) add('sr', `nav with ${cur} aria-current, needs exactly one (the entry that is this page)`, n);
  }
  for (const t of all.filter(e => e.matches('table') && e.querySelector('th a[href*="sort="]')))
    if (t.querySelectorAll('th[aria-sort]').length !== 1) add('sr', 'sortable table without exactly one th[aria-sort]', t);
  let level = 0;
  for (const h of all.filter(e => e.matches('h1, h2, h3, h4, h5, h6'))) { const l = +h.tagName[1]; if (level && l > level + 1) add('sr', `heading skips from h${level} to h${l}`, h); level = l; }
  // a skip link where something focusable comes before main (header, nav)
  if (!ownPage && !specimens && [...document.querySelectorAll('header, nav')].some(e => !e.closest('main') && e.querySelector(focusable))) { const first = document.body.querySelector(focusable); if (first && !first.closest('main') && !(first.matches('a[href^="#"]') && document.querySelector(`main${first.getAttribute('href')}, main ${first.getAttribute('href')}`))) add('sr', 'no skip link to main as the first focusable element'); }
  return P;
},

// focus indicator: focus each kind of control once and compare its outline, shadow and border
focus: () => {
  const P = [], seen = new Set();
  for (const el of document.querySelectorAll('main a[href], main button, main summary, main input, main select, main textarea, header a, header button, header input')) {
    const kind = el.tagName + '.' + el.className + '.' + el.type;
    if (seen.has(kind) || el.matches('.is-focus, .is-hover, .is-active') || !el.getClientRects().length || el.closest('[hidden], dialog:not([open])')) continue;
    seen.add(kind);
    if (document.activeElement === el) el.blur();
    // the element and its 3 nearest ancestors: a field may show focus on its frame (:focus-within), not on itself
    const look = () => [el, el.parentElement, el.parentElement?.parentElement, el.parentElement?.parentElement?.parentElement].filter(Boolean)
      .map(e => { const s = getComputedStyle(e); return [s.outlineStyle, s.boxShadow, s.borderColor, s.backgroundColor].join(); }).join('|');
    const b = look();
    el.focus({focusVisible: true});
    const a = look();
    if (document.activeElement === el && a === b) P.push(`a11y: no visible focus — ${el.tagName.toLowerCase()}.${el.className}`);
    el.blur();
  }
  return P;
},

// real data: long words, emails, ids in every text, only where user data shows up; labels of tabs, buttons and segments
// come from the app and stay short
stress: () => {
  const long = ['Donaudampfschifffahrtsgesellschaftskapitänswitwe', 'buchhaltung.oesterreich@sehr-lange-firmendomain.example', 'CUS-0123456789ABCDEF0123'];
  let i = 0;
  for (const el of document.querySelectorAll('main :is(td, h1, p, li, .chip, .tag, code, .info > span, .crumbs span, .crumbs a, .value)')) {
    const t = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (t) t.textContent += ' ' + long[i++ % long.length];
  }
},

// money parsing and formatting from ui.js (window.money); returns the cases that fail
money: money => {
  const cases = [['1.240,00', 124000], ['1,240.50', 124050], ['1240', 124000], ['1240.5', 124050], ['-12', -1200], ['−3,5', -350],
    ['1.234.567,89', 123456789], ['1 240,00 €', 124000], ['12,3456', NaN], ['1.2.3', NaN], ['abc', NaN],
    // one separator and three digits follows the example; mixed group separators are refused
    ['0,125', NaN], ['19,999', NaN], ['1.500', 150000], ['0.999', NaN, '1,234.56'], ['1,500', 150000, '1,234.56'], ['1,500', NaN, '1234.56'],
    ['1.234,567.89', NaN], ['1,234.567,89', NaN], ['1.234.567', 123456700]];
  return cases.filter(([s, c, ex]) => !Object.is(money.parse(s, ex), c)).concat(
    [[124050, '1.234,56', '1.240,50'], [123456789, '1,234.56', '1,234,567.89'], [-30000, '1.234,56', '−300,00'], [5, '1234.56', '0.05'], [124000, '1.234,56', '+1.240,00', true], [0, '1.234,56', '0,00', true]]
      .filter(([c, ex, want, signed]) => money.format(c, ex, signed) !== want)).map(c => JSON.stringify(c));
},
})
