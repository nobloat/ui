// nobloat/ui, generated from the app's pages by ui.Assets: do not edit

// token/base.js
// base: what the parts' scripts share, loaded before them whenever a page has any.
// window.nb: what parts share. nb.failed(name) shows an error toast that stays until closed.
window.nb = window.nb || {};
nb.html = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
nb.esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
nb.failed = name => {
  let box = document.querySelector('.toasts');
  if (!box) { box = nb.html('<div class="toasts" role="status"></div>'); document.body.append(box); }
  box.append(nb.html(`<div class="message" role="alert" style="--c:var(--danger)"><i class="icon-error" aria-hidden="true"></i><span>Could not save ${nb.esc(name)}. Try again.</span><button type="button" class="button icon-only" aria-label="Close" title="Close"><i class="icon-x" aria-hidden="true"></i></button></div>`));
};

// nb.save(el, name, value): one value saves on its own (autosave). POSTs name=value to the nearest action (the element's
// action attribute or an ancestor's data-action) and rejects on anything but 2xx. Design system pages (<html data-demo>) have
// no server: there it takes about a second and fails for a value with "fail" in it or a control with data-fail.
nb.save = async (el, name, value) => {
  const action = el.getAttribute('action') || el.closest('[data-action]')?.dataset.action;
  if (!action && document.documentElement.hasAttribute('data-demo'))
    return new Promise((ok, no) => setTimeout(() => String(value).includes('fail') || el.dataset.fail !== undefined ? no() : ok(), 900));
  if (!action) throw new Error(`nb.save: no action for ${name}`);
  const r = await fetch(action, {method: 'POST', body: new URLSearchParams({[name]: value}), credentials: 'same-origin'});
  if (!r.ok) throw new Error(`nb.save: ${r.status}`);
};
nb.ring = '<i class="busy-ring" aria-hidden="true"></i>';
nb.tick = '<i class="icon-check" aria-hidden="true"></i>';

// components/editable
// <nb-editable class="editable" label value [type unit min pattern error name action]>, followed by its
// <span class="field-hint" id>: a value that saves on its own (Rules: Editable field). The server renders the view (the value
// and the pencil); this adds the editing: Enter or leaving saves (nb.save), Esc puts the old value back; one save at a time.
class NbEditable extends HTMLElement {
  static observedAttributes = ['label', 'value', 'type', 'unit', 'min', 'pattern', 'error', 'name', 'action'];
  connectedCallback() {
    if (this.hintEl !== undefined) return;
    this.hintEl = this.nextElementSibling?.matches('.field-hint') ? this.nextElementSibling : null;
    this.hint = this.hintEl?.innerHTML ?? '';
    this.view();
  }
  attributeChangedCallback() { if (this.hintEl !== undefined && !this.querySelector('input')) this.view(); }
  a(n, d = '') { return this.getAttribute(n) ?? d; }
  setHint() { if (this.hintEl) { this.hintEl.innerHTML = this.hint; this.hintEl.classList.remove('is-error'); } }
  setError() { if (this.hintEl) { this.hintEl.innerHTML = `<i class="icon-error" aria-hidden="true"></i>${nb.esc(this.a('error', 'Not a valid value.'))}`; this.hintEl.classList.add('is-error'); } }
  view() {
    const label = this.a('label'), unit = this.a('unit');
    this.replaceChildren(nb.html(`<div class="value"><span>${nb.esc(this.a('value'))}${unit ? ' ' + nb.esc(unit) : ''}</span><button type="button" class="button icon-only" aria-label="Edit ${nb.esc(label)}" title="Edit ${nb.esc(label)}"><i class="icon-edit" aria-hidden="true"></i></button></div>`));
    const b = this.querySelector('button');
    b.addEventListener('click', () => this.edit());
    return b;
  }
  async save(next, draft) {
    const old = this.a('value'), label = this.a('label');
    this.setAttribute('value', next);
    const b = this.view(); b.disabled = true; b.innerHTML = nb.ring; b.setAttribute('aria-label', 'Saving'); this.classList.add('is-saving');
    try {
      await nb.save(this, this.a('name', label), next);
      this.classList.remove('is-saving'); b.disabled = false; b.innerHTML = nb.tick; b.classList.add('is-saved'); b.setAttribute('aria-label', 'Saved'); b.focus();
      setTimeout(() => { b.innerHTML = '<i class="icon-edit" aria-hidden="true"></i>'; b.classList.remove('is-saved'); b.setAttribute('aria-label', `Edit ${label}`); }, 2000);
    } catch { this.classList.remove('is-saving'); this.setAttribute('value', old); nb.failed(label); this.edit(draft); }
  }
  edit(draft = this.a('value')) {
    const min = this.a('min'), pattern = this.a('pattern');
    const input = nb.html(`<input class="input" type="${nb.esc(this.a('type', 'text'))}" aria-label="${nb.esc(this.a('label'))}" title="Enter saves, Esc cancels" required${this.hintEl?.id ? ` aria-describedby="${this.hintEl.id}"` : ''}${min ? ` min="${nb.esc(min)}"` : ''}${pattern ? ` pattern="${nb.esc(pattern)}"` : ''}>`);
    input.value = draft;
    this.replaceChildren(input);
    let done = false;
    const commit = () => {
      if (done) return;
      const v = input.value.trim();
      if (!input.checkValidity() || !v) { input.setAttribute('aria-invalid', 'true'); this.setError(); input.focus(); return; }
      done = true; this.setHint();
      if (v === this.a('value')) this.view(); else this.save(v, input.value);
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done = true; this.setHint(); this.view().focus(); }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (this.contains(input) && document.activeElement !== input) commit(); }, 0));
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); this.setHint(); } });
    input.focus(); input.select();
  }
}
customElements.define('nb-editable', NbEditable);

// components/message
// message: the close button, or the end of its bar (data-auto), fades it out (duration-slow, ease; instant with reduced motion), then removes it
const closeMessage = m => { m.classList.add('closing'); setTimeout(() => m.remove(), parseFloat(getComputedStyle(m).transitionDuration) * 1000); };
document.addEventListener('click', e => { const m = e.target.closest('.message > .button')?.parentElement; if (m) closeMessage(m); });
document.addEventListener('animationend', e => { if (e.animationName === 'message-stay') closeMessage(e.target); });

// components/theme-switch
// theme: switching is CSS (radios name=theme). This only remembers the choice where no server does (static pages):
// it restores the saved radio on load and saves it on change. Same storage key as ui.js.
{
  let saved = ''; try { saved = localStorage.getItem('theme') ?? ''; } catch {}
  const r = document.getElementById('theme-' + (saved || 'auto')); if (r) r.checked = true;
  document.addEventListener('change', e => { if (e.target.name !== 'theme') return;
    try { e.target.value === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', e.target.value); } catch {} });
}

// blocks/palette
// command palette: Ctrl K opens. Typing ranks the rows within their groups by a fuzzy match (the letters in order;
// word starts and runs score most), hides the rest and marks the matched letters; arrows move, Enter selects.
// The field is a combobox, so the selected row is announced while focus stays in it.
// Rows are links or buttons, so without this script they still work by click and Tab.
const fuzzy = (q, text) => { // -> {score, at: [indexes]} or null
  const t = text.toLowerCase(), at = []; let score = 0, from = 0;
  for (const ch of q) {
    let i = -1; // prefer the letter at a word start, else the next one
    for (let j = from; j < t.length; j++) if (t[j] === ch && (j === 0 || t[j - 1] === ' ')) { i = j; break; }
    if (i < 0) i = t.indexOf(ch, from);
    if (i < 0) return null;
    score += 1 + (i === 0 || t[i - 1] === ' ' ? 3 : 0) + (at.length && i === at.at(-1) + 1 ? 2 : 0);
    at.push(i); from = i + 1;
  }
  return {score: score - t.length / 100, at}; // shorter wins a tie
};
for (const dlg of document.querySelectorAll('.command-palette')) {
  const input = dlg.querySelector('input'), list = dlg.querySelector('.menu'), empty = list.querySelector('.no-match');
  const rows = [...list.querySelectorAll(':scope > :is(a, button)')];
  const groups = [];
  for (const el of list.children) {
    if (el.matches('.group')) groups.push({head: el, rows: []});
    else if (el.matches('a, button')) { if (!groups.length) groups.push({head: null, rows: []}); groups.at(-1).rows.push(el); }
  }
  rows.forEach((r, i) => { r.id ||= `${dlg.id}-row-${i}`; r.setAttribute('role', 'option'); r.tabIndex = -1; r.dataset.order = i;
    const l = r.querySelector('span'); l.dataset.text = l.textContent; });
  const shown = () => [...list.querySelectorAll(':scope > [role=option]:not([hidden])')];
  const select = r => { rows.forEach(x => x.removeAttribute('aria-selected')); r?.setAttribute('aria-selected', 'true');
    r ? input.setAttribute('aria-activedescendant', r.id) : input.removeAttribute('aria-activedescendant');
    r?.scrollIntoView({block: 'nearest', container: 'nearest'}); };
  const filter = () => {
    const q = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
    for (const g of groups) {
      const ranked = g.rows.map(r => {
        const l = r.querySelector('span'), m = q ? fuzzy(q, l.dataset.text) : {score: 0, at: []};
        r.hidden = !m;
        l.replaceChildren(...(m ? [...l.dataset.text].map((c, i) => m.at.includes(i) ? Object.assign(document.createElement('mark'), {textContent: c}) : c) : [l.dataset.text]));
        return {r, s: m ? m.score : -1};
      });
      ranked.sort((a, b) => q ? b.s - a.s : a.r.dataset.order - b.r.dataset.order);
      let after = g.head;
      for (const {r} of ranked) { after ? after.after(r) : list.prepend(r); after = r; }
      if (g.head) g.head.hidden = ranked.every(x => x.r.hidden);
    }
    if (empty) { empty.hidden = shown().length > 0; empty.querySelector('q').textContent = input.value.trim(); }
    select(shown()[0]);
  };
  input.addEventListener('input', filter);
  input.addEventListener('keydown', e => {
    const s = shown(), i = s.findIndex(r => r.hasAttribute('aria-selected'));
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && s.length) { e.preventDefault(); select(s[(i + (e.key === 'ArrowDown' ? 1 : -1) + s.length) % s.length]); }
    else if (e.key === 'Enter') { e.preventDefault(); if (s[i]) { s[i].click(); dlg.close(); } }
  });
  dlg.addEventListener('close', () => { input.value = ''; filter(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); dlg.showModal(); } });
  filter();
}

// blocks/settings
// Settings section: a checkbox, radio or segmented control saves on change (nb.save: name=value, a checkbox's value or empty).
// Disabled while saving; a spinner in its slot (.save-state, added here up front so nothing moves) only after half a second,
// then a check for 2 s; a failed save puts the old value back and shows an error toast naming the setting.
{
for (const c of document.querySelectorAll('.setting-rows dd > :is(.segmented, .choice)')) if (!c.nextElementSibling?.matches('.save-state')) c.after(nb.html('<span class="save-state" role="status"></span>'));
for (const r of document.querySelectorAll('.setting-rows input[type=radio]:checked')) r.dataset.was = '';
document.addEventListener('change', async e => {
  const input = e.target, dd = input.closest('.setting-rows dd');
  if (!dd || input.closest('.editable') || !input.matches('[type=checkbox], [type=radio]')) return;
  const ctl = input.closest('.segmented, .choice'), st = ctl.nextElementSibling, name = dd.previousElementSibling.textContent;
  const group = input.type === 'radio' ? [...dd.querySelectorAll(`input[name="${input.name}"]`)] : [input];
  const before = input.type === 'radio' ? group.find(r => r.dataset.was !== undefined) : null;
  st.innerHTML = ''; st.classList.remove('is-saved'); group.forEach(r => r.disabled = true);
  const slow = setTimeout(() => { st.innerHTML = `${nb.ring}<span class="sr">saving</span>`; }, 500);
  try {
    const value = input.type === 'checkbox' ? (input.checked ? input.value : '') : input.value;
    try { await nb.save(input, input.name || name, value); } finally { group.forEach(r => r.disabled = false); clearTimeout(slow); }
    st.innerHTML = `${nb.tick}<span class="sr">saved</span>`; st.classList.add('is-saved');
    group.forEach(r => delete r.dataset.was); if (input.type === 'radio') input.dataset.was = '';
    setTimeout(() => { st.innerHTML = ''; st.classList.remove('is-saved'); }, 2000);
  } catch {
    st.innerHTML = '';
    if (input.type === 'checkbox') input.checked = !input.checked; else if (before) before.checked = true;
    nb.failed(name);
  }
});
}

// blocks/user-menu
// user menu: the language radios load the page again in the chosen language (?lang=); the server keeps the choice.
document.addEventListener('change', e => {
  if (e.target.name !== 'lang' || !e.target.closest('.menu, .setting-rows')) return;
  const u = new URL(location.href); u.searchParams.set('lang', e.target.value); location.assign(u);
});
