// nobloat/ui v1: copy unchanged to web/static/ui.js; app-specific code goes in app.js (loaded after).
// Progressive enhancement only: every page works without it. Texts come from <script id="texts" type="application/json">.
const $ = (s, el = document) => el.querySelector(s);
window.T = JSON.parse(document.getElementById('texts')?.textContent || '{}');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

// confirmation for destructive or public actions: <form data-confirm="Delete X?">; the submit button shows a spinner
window.confirmDlg = text => new Promise(res => {
  const d = $('#confirm');
  if (!d) return res(confirm(text));
  $('#confirm-text').textContent = text;
  d.returnValue = '';
  d.onclose = () => res(d.returnValue === 'yes');
  d.showModal();
});
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.method === 'dialog') return;
  if (f.dataset.confirm && !f.dataset.confirmed) {
    e.preventDefault();
    if (await confirmDlg(f.dataset.confirm)) { f.dataset.confirmed = 1; f.requestSubmit(e.submitter); }
    return;
  }
  delete f.dataset.confirmed;
  if (f.target !== '_blank') e.submitter?.setAttribute('aria-busy', 'true');
});

// theme toggle cycles auto (follows the OS) -> light -> dark -> auto; the <head> script applies it before first paint
{
  const b = $('#theme'), root = document.documentElement;
  if (b) {
    const names = {'': ['◐', T['js.theme.auto'] || 'auto'], light: ['☀︎', T['js.theme.light'] || 'light'], dark: ['☾', T['js.theme.dark'] || 'dark']};
    const show = () => { const [i, n] = names[root.dataset.theme || '']; b.textContent = i; b.title = (T['js.theme'] || 'theme') + ': ' + n; b.setAttribute('aria-label', b.title); };
    b.onclick = () => {
      const t = ({'': 'light', light: 'dark', dark: ''})[root.dataset.theme || ''];
      t ? root.dataset.theme = t : delete root.dataset.theme;
      try { t ? localStorage.setItem('theme', t) : localStorage.removeItem('theme'); } catch {}
      show();
    };
    show();
    b.hidden = false;
  }
  const m = $('#menu'), nav = $('#nav');
  if (m && nav) m.onclick = () => { const open = nav.classList.toggle('open'); m.setAttribute('aria-expanded', open); m.textContent = open ? '✕' : '☰'; };
  // nav shortcut letters: underline the first matching letter of each label
  document.querySelectorAll('nav.app a[data-g]').forEach(a => {
    const t = a.textContent, i = t.toLowerCase().indexOf(a.dataset.g);
    if (i >= 0) a.innerHTML = esc(t.slice(0, i)) + '<u>' + esc(t[i]) + '</u>' + esc(t.slice(i + 1));
  });
}

// live search: <form class="gsearch" data-api="/api/search"> gets {"group": [{url, title, sub}]}; without data-api it is a plain GET form
{
  const q = $('#q'), box = $('#results'), api = q?.form?.dataset.api;
  if (q && box && api) {
    let t, sel = -1;
    const items = () => [...box.querySelectorAll('a')];
    const mark = () => items().forEach((a, i) => a.classList.toggle('sel', i === sel));
    const run = async () => {
      const v = q.value.trim();
      if (!v) { box.hidden = true; return; }
      const r = await fetch(api + (api.includes('?') ? '&' : '?') + 'limit=8&q=' + encodeURIComponent(v));
      if (!r.ok || q.value.trim() !== v) return;
      let html = '';
      for (const [grp, hits] of Object.entries(await r.json())) {
        if (!hits.length) continue;
        html += `<div class="grp">${esc(T['search.' + grp] || grp)}</div>`;
        for (const h of hits) html += `<a href="${esc(h.url)}"><span>${esc(h.title || h.id)}</span><span class="sub">${esc(h.sub || '')}</span></a>`;
      }
      box.innerHTML = html || `<div class="none">${esc(T['search.none'] || '—')}</div>`;
      box.hidden = false;
      sel = items().length ? 0 : -1;
      mark();
    };
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
    q.addEventListener('keydown', e => {
      const it = items();
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'j')) { e.preventDefault(); sel = Math.min(sel + 1, it.length - 1); mark(); }
      else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'k')) { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
      else if (e.key === 'Enter' && it[sel] && !box.hidden) { e.preventDefault(); location = it[sel].href; }
      else if (e.key === 'Escape') { box.hidden = true; q.value ? q.value = '' : q.blur(); e.stopPropagation(); }
    });
    q.addEventListener('blur', () => setTimeout(() => box.hidden = true, 150));
  }
}

// multi-value autocomplete (tags): <input data-pick="tags"> + <datalist id="tags"><option value="#name" label="Label">.
// Space-separated tokens; name and label match anywhere, prefix matches first, used tokens are left out;
// ↑/↓ choose, Tab/Enter pick, Esc closes. Single values need no JS: <input list="tags"> is native.
{
  let box;
  const close = () => { box?.remove(); box = null; };
  const open = el => {
    close();
    const m = el.value.slice(0, el.selectionStart).match(/(^|\s)(\S*)$/), q = m[2].toLowerCase();
    const used = new Set(el.value.toLowerCase().split(/\s+/));
    const hits = [...document.querySelectorAll(`#${CSS.escape(el.dataset.pick)} option`)]
      .map(o => ({v: o.value, label: o.label || o.value, at: Math.min(...[o.value, o.label].map(s => s.toLowerCase().indexOf(q.replace(/^#/, ''))).filter(i => i >= 0))}))
      .filter(t => t.at < Infinity && (!used.has(t.v.toLowerCase()) || t.v.toLowerCase() === q))
      .sort((a, b) => (a.at > 1) - (b.at > 1) || a.v.localeCompare(b.v)).slice(0, 8);
    if (!hits.length) return;
    box = document.createElement('div');
    box.className = 'results pick';
    box.innerHTML = hits.map(t => `<a href="#" data-v="${esc(t.v)}"><span>${esc(t.label)}</span><span class="sub">${t.label === t.v ? '' : esc(t.v)}</span></a>`).join('');
    const r = el.getBoundingClientRect();
    box.style.cssText = `left:${r.left + scrollX}px;top:${r.bottom + scrollY + 2}px`;
    if (q) box.firstChild.classList.add('sel'); // Enter picks only while typing a token
    box.el = el;
    document.body.append(box);
    const start = el.selectionStart - m[2].length;
    const pick = v => {
      const rest = el.value.slice(el.selectionStart).replace(/^\S*\s*/, '');
      el.value = el.value.slice(0, start) + v + ' ' + rest;
      el.setSelectionRange(start + v.length + 1, start + v.length + 1);
      el.dispatchEvent(new Event('input', {bubbles: true}));
    };
    box.onmousedown = e => { e.preventDefault(); const a = e.target.closest('a'); if (a) pick(a.dataset.v); };
  };
  const ours = el => el.matches?.('input[data-pick]:not([readonly])');
  document.addEventListener('input', e => { if (ours(e.target)) open(e.target); });
  document.addEventListener('focusin', e => { if (ours(e.target)) open(e.target); });
  document.addEventListener('focusout', e => { if (ours(e.target)) setTimeout(() => { if (box?.el !== document.activeElement) close(); }, 150); });
  document.addEventListener('keydown', e => {
    if (!box || e.target !== box.el) return;
    const as = [...box.querySelectorAll('a')], i = as.findIndex(a => a.classList.contains('sel'));
    if ((e.key === 'Tab' || e.key === 'Enter') && i >= 0) { e.preventDefault(); e.stopImmediatePropagation(); box.onmousedown({preventDefault() {}, target: as[i]}); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const down = e.key === 'ArrowDown';
      as[i]?.classList.remove('sel');
      as[i < 0 ? (down ? 0 : as.length - 1) : (i + (down ? 1 : as.length - 1)) % as.length].classList.add('sel');
    }
    else if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
  }, true);
}

// autosave: <form data-autosave> posts on change (Accept: application/json, answer {rev?, error?}) and reports in .saved;
// the plain submit button stays the no-JS path. Pages may listen for the "saved" event to re-render.
document.addEventListener('change', async e => {
  const f = e.target.form;
  if (!f?.matches('[data-autosave]')) return;
  const r = await fetch(f.action, {method: 'POST', body: new URLSearchParams(new FormData(f)), headers: {Accept: 'application/json'}}).catch(() => null);
  const j = await r?.json().catch(() => ({})) || {};
  const s = $('.saved', f) || $('.saved');
  if (r?.ok) {
    if (f.elements.rev && j.rev) f.elements.rev.value = j.rev;
    if (s) { s.textContent = '✓ ' + (T['js.saved'] || 'saved') + ' ' + new Date().toLocaleTimeString(); s.classList.remove('err'); }
    f.dispatchEvent(new CustomEvent('saved', {detail: j}));
  } else if (s) { s.textContent = '✕ ' + (T['err.' + j.error] || j.error || T['js.error'] || 'error'); s.classList.add('err'); }
});

// keyboard, vim style. Page handlers first (window.pageKeys = {key: fn}, return false to fall through), then:
// g+letter nav · / search · ? help · Ctrl+K or : palette · j/k rows · Enter open · h/l tabs · [ ] pages · 1-9 chips · Esc up · [data-key] click
{
  let g = false, sel = -1;
  const rows = () => [...document.querySelectorAll('main tr[data-href]')];
  const mark = () => rows().forEach((r, i) => r.classList.toggle('sel', i === sel));
  const visible = s => [...document.querySelectorAll(s)].filter(el => el.offsetParent !== null);
  const go = el => { if (el) location = el.href; };
  const keyName = e => (e.ctrlKey || e.metaKey ? 'C-' : '') + (e.altKey ? 'A-' : '') + (e.altKey ? e.code.replace(/^Key/, '').toLowerCase() : e.key);
  document.addEventListener('keydown', async e => {
    if (document.querySelector('dialog[open]')) return;
    const k = keyName(e);
    if (e.target.matches('input, select, textarea, [contenteditable]')) {
      if (k === 'Escape') { e.target.blur(); e.preventDefault(); }
      else if (window.pageKeys?.[k] && /^[AC]-/.test(k)) { e.preventDefault(); window.pageKeys[k](e); }
      return;
    }
    if (g) { g = false; const a = $(`nav.app a[data-g="${CSS.escape(e.key)}"]`); if (a) { e.preventDefault(); go(a); } return; }
    if (window.pageKeys?.[k]) { e.preventDefault(); if (await window.pageKeys[k](e) !== false) return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const r = rows(), tabs = visible('.tabs a'), cur = tabs.findIndex(a => a.classList.contains('on'));
    const step = d => { sel = Math.max(0, Math.min(sel + d, r.length - 1)); mark(); r[sel]?.scrollIntoView({block: 'nearest'}); };
    const keys = {
      g: () => g = true,
      '/': () => $('#q')?.focus(),
      '?': () => $('#help')?.showModal(),
      j: () => step(1), k: () => step(-1),
      Enter: () => { if (r[sel]) location = r[sel].dataset.href; },
      h: () => go(tabs[cur - 1]), l: () => go(tabs[cur + 1]),
      '[': () => go($('.pager a[rel=prev]')), ']': () => go($('.pager a[rel=next]')),
      Escape: () => go($('a.up')),
    };
    const chip = /^[1-9]$/.test(e.key) && visible('main .chips a.chip')[+e.key - 1];
    const el = visible(`[data-key="${CSS.escape(e.key)}"]`)[0];
    if (el) { e.preventDefault(); el.matches('input, select, textarea') ? el.focus() : el.click(); }
    else if (chip) { e.preventDefault(); go(chip); }
    else if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  });
  document.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button, input, select, label')) location = tr.dataset.href;
  });
}

// overflow menus open towards the side with room
document.addEventListener('toggle', e => {
  const d = e.target, m = d.matches?.('details.more') && d.open && $('.menu', d);
  if (m) { m.classList.remove('left'); if (m.getBoundingClientRect().left < 0) m.classList.add('left'); }
}, true);

// tables: each cell gets its column header as data-label, which phones show as "label … value" lines
document.querySelectorAll('main table:not(.keep)').forEach(t => {
  const heads = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
  t.querySelectorAll('tbody tr, tfoot tr').forEach(tr => [...tr.cells].forEach((td, i) => td.dataset.label = heads[i] ?? ''));
});

// command palette: Ctrl+K (anywhere) or : opens it. Commands: the nav (g+letter), every visible [data-key] button or link,
// theme, shortcuts help, the app's window.commands = [{label, sub, run}], and a search fallback.
{
  const pal = document.createElement('dialog');
  pal.className = 'palette';
  pal.setAttribute('aria-label', T['palette.title'] || 'commands');
  pal.innerHTML = `<input aria-label="${esc(T['palette.title'] || 'commands')}" placeholder="${esc(T['palette.placeholder'] || 'command…')}" autocomplete="off"><ul role="listbox"></ul>`;
  document.body.append(pal);
  const inp = $('input', pal), ul = $('ul', pal);
  let cmds = [], hits = [], sel = 0;
  const text = el => [...el.childNodes].filter(n => n.nodeName !== 'KBD').map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const gather = () => {
    const c = [];
    document.querySelectorAll('nav.app a[data-g]').forEach(a => c.push({label: text(a), sub: 'g ' + a.dataset.g, run: () => location = a.href}));
    document.querySelectorAll('main [data-key]').forEach(el => { if (el.offsetParent !== null) c.push({label: text(el) || el.getAttribute('aria-label') || el.title, sub: el.dataset.key, run: () => el.click()}); });
    if ($('#theme')) c.push({label: T['palette.theme'] || 'switch theme', sub: '◐', run: () => $('#theme').click()});
    if ($('#help')) c.push({label: T['palette.help'] || 'keyboard shortcuts', sub: '?', run: () => $('#help').showModal()});
    return c.concat(window.commands || []).filter(x => x.label);
  };
  // match: contiguous first (earlier is better), then every letter in order; marks what matched
  const match = (label, q) => {
    const l = label.toLowerCase(), i = l.indexOf(q);
    if (!q) return {score: 0, html: esc(label)};
    if (i >= 0) return {score: i, html: esc(label.slice(0, i)) + '<mark>' + esc(label.slice(i, i + q.length)) + '</mark>' + esc(label.slice(i + q.length))};
    let j = 0, html = '';
    for (const ch of label) { if (j < q.length && ch.toLowerCase() === q[j]) { html += '<mark>' + esc(ch) + '</mark>'; j++; } else html += esc(ch); }
    return j === q.length ? {score: 100 + label.length, html} : null;
  };
  const render = () => {
    const q = inp.value.trim().toLowerCase();
    hits = cmds.map(c => ({c, m: match(c.label, q)})).filter(h => h.m).sort((a, b) => a.m.score - b.m.score);
    const form = $('form.gsearch');
    if (q && form) hits.push({c: {label: (T['palette.search'] || 'search') + ': ' + inp.value.trim(), sub: '/', run: () => { form.q.value = inp.value.trim(); form.requestSubmit(); }}, m: {html: esc((T['palette.search'] || 'search') + ': ' + inp.value.trim())}});
    sel = Math.min(sel, Math.max(hits.length - 1, 0));
    ul.innerHTML = hits.map((h, i) => `<li role="option" data-i="${i}"${i === sel ? ' class="sel" aria-selected="true"' : ''}><span>${h.m.html}</span><span class="sub">${esc(h.c.sub || '')}</span></li>`).join('')
      || `<li class="none">${esc(T['search.none'] || '—')}</li>`;
    ul.querySelector('.sel')?.scrollIntoView({block: 'nearest'});
  };
  const run = i => { const h = hits[i]; if (!h) return; pal.close(); h.c.run(); };
  window.openPalette = () => { if (pal.open) return; cmds = gather(); inp.value = ''; sel = 0; render(); pal.showModal(); inp.focus(); };
  inp.addEventListener('input', () => { sel = 0; render(); });
  inp.addEventListener('keydown', e => {
    const down = e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'j'), up = e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'k');
    if (down || up) { e.preventDefault(); sel = (sel + (down ? 1 : hits.length - 1)) % Math.max(hits.length, 1); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
  });
  ul.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) run(+li.dataset.i); });
  pal.addEventListener('click', e => { if (e.target === pal) pal.close(); }); // backdrop
  document.addEventListener('keydown', e => {
    const field = e.target.matches('input, select, textarea, [contenteditable]');
    if (((e.ctrlKey || e.metaKey) && e.key === 'k' && !(field && e.target.closest('form.gsearch'))) || (e.key === ':' && !field && !document.querySelector('dialog[open]'))) {
      e.preventDefault(); e.stopImmediatePropagation(); window.openPalette();
    }
  }, true);
}

// dialogs: [data-open=id] opens, [data-close] closes (Escape is native); [data-copy=text] copies; .nojs hides fallbacks
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-open]'), c = e.target.closest('[data-copy]');
  if (o) $('#' + o.dataset.open)?.showModal();
  else if (e.target.closest('[data-close]')) e.target.closest('dialog').close();
  else if (c) { await navigator.clipboard.writeText(c.dataset.copy); const t = c.textContent; c.textContent = '✓'; setTimeout(() => c.textContent = t, 1200); }
});
document.querySelectorAll('.nojs').forEach(b => b.hidden = true);

// morph patches a into b in place, so focus and caret survive a live re-render; unfocused inputs take the server value
window.morph = (a, b) => {
  if (a.nodeName !== b.nodeName) return a.replaceWith(b);
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const {name} of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const {name, value} of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a !== document.activeElement) {
    if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.checked; else a.value = b.value;
  }
  const ac = [...a.childNodes], bc = [...b.childNodes];
  bc.forEach((n, i) => ac[i] ? morph(ac[i], n) : a.append(n));
  ac.slice(bc.length).forEach(n => n.remove());
};

// toasts: the page's flash messages float bottom right (full width on phones); successes fade after 5s, errors stay until closed.
// Without JS they stay where the page put them.
{
  const ps = document.querySelectorAll('main p.flash');
  if (ps.length) {
    const box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    document.body.append(box);
    for (const p of ps) {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', T['js.close'] || 'close');
      x.onclick = () => p.remove();
      p.append(x);
      box.append(p);
      if (p.classList.contains('ok')) setTimeout(() => { p.classList.add('out'); setTimeout(() => p.remove(), 400); }, 5000);
    }
  }
}

// back/forward always show current data: a page answering a POST becomes a plain entry (no "resubmit?"),
// and a page restored from the back/forward cache reloads (also clears spinners)
history.replaceState(history.state, '', location.href);
addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
