// nobloat components: behaviour that CSS cannot do. Proposal; moves into ui.js at the streamlining.

// Date and time fields: the text field is the value (dd.mm.yyyy, hh:mm, 24 h); the button opens the browser's
// own picker on a hidden native input and writes the choice back. Without JavaScript the button stays hidden.
for (const box of document.querySelectorAll('.picker')) {
  const text = box.querySelector('.input'), native = box.querySelector('input[type=date], input[type=time]'), button = box.querySelector('button');
  if (!text || !native?.showPicker || !button) continue;
  const isDate = native.type === 'date';
  const toNative = v => { const m = isDate ? v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/) : v.match(/^(\d{2}):(\d{2})$/); return m ? (isDate ? `${m[3]}-${m[2]}-${m[1]}` : v) : ''; };
  const fromNative = v => isDate ? v.split('-').reverse().join('.') : v;
  button.hidden = false;
  button.addEventListener('click', () => { native.value = toNative(text.value); native.showPicker(); });
  native.addEventListener('change', () => { if (native.value) { text.value = fromNative(native.value); text.dispatchEvent(new Event('change', {bubbles: true})); } });
}

// message: the close button, or the end of its bar (data-auto), fades it out (duration-slow, ease; instant with reduced motion), then removes it
const closeMessage = m => { m.classList.add('closing'); setTimeout(() => m.remove(), parseFloat(getComputedStyle(m).transitionDuration) * 1000); };
document.addEventListener('click', e => { const m = e.target.closest('.message > .button')?.parentElement; if (m) closeMessage(m); });
document.addEventListener('animationend', e => { if (e.animationName === 'message-stay') closeMessage(e.target); });

// theme: switching is CSS (radios name=theme). This only remembers the choice where no server does (static pages):
// it restores the saved radio on load and saves it on change. Same storage key as ui.js.
{
  let saved = ''; try { saved = localStorage.getItem('theme') ?? ''; } catch {}
  const r = document.getElementById('theme-' + (saved || 'auto')); if (r) r.checked = true;
  document.addEventListener('change', e => { if (e.target.name !== 'theme') return;
    try { e.target.value === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', e.target.value); } catch {} });
}

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

// one-time code: digits only, at most six; a pasted code is cleaned first ("123 456", "123-456" → 123456), so maxlength
// does not cut it. Without script maxlength="6" and the pattern still hold. Apps get it with ui.js at the streamlining.
document.addEventListener('paste', e => {
  const el = e.target.closest?.('input[autocomplete="one-time-code"]'); if (!el) return;
  e.preventDefault(); el.value = (e.clipboardData.getData('text').match(/\d/g) || []).join('').slice(0, 6);
  el.dispatchEvent(new Event('input', {bubbles: true}));
});
document.addEventListener('input', e => {
  const el = e.target.closest?.('input[autocomplete="one-time-code"]'); if (!el) return;
  const v = el.value.replace(/\D/g, '').slice(0, 6); if (v !== el.value) el.value = v;
});

{ // own scope: these names stay out of the page's globals
// Saving, shared by the editable field and the settings section. saveValue stands in for the app's POST: about a second,
// and it fails for a value with "fail" in it or a control with data-fail, to show the error.
const SAVE_MS = 900, FAST_MS = 500;
const saveValue = (v, el) => new Promise((ok, no) => setTimeout(() => String(v).includes('fail') || el?.dataset.fail !== undefined ? no() : ok(), SAVE_MS));
const html = s => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const ring = '<i class="busy-ring" aria-hidden="true"></i>', tick = '<i class="icon-check" aria-hidden="true"></i>';
// an error toast: stays until closed
const failed = name => {
  let box = document.querySelector('.toasts');
  if (!box) { box = html('<div class="toasts" role="status"></div>'); document.body.append(box); }
  const m = html(`<div class="message" role="alert" style="--c:var(--danger)"><i class="icon-error" aria-hidden="true"></i><span>Could not save ${esc(name)}. Try again.</span><button type="button" class="button icon-only" aria-label="Close" title="Close"><i class="icon-x" aria-hidden="true"></i></button></div>`);
  m.querySelector('button').onclick = () => m.remove(); box.append(m);
};

// Editable field: <div class="editable" data-label data-value [data-type data-unit data-min data-pattern data-error]>
// followed by its <span class="field-hint" id>. Enter or leaving saves, Esc puts the old value back; one save at a time.
for (const ed of document.querySelectorAll('.editable[data-label]')) {
  const {label, type = 'text', unit = '', min, pattern, error = 'Not a valid value.'} = ed.dataset;
  const hintEl = ed.nextElementSibling?.matches('.field-hint') ? ed.nextElementSibling : null, hint = hintEl?.innerHTML ?? '';
  let value = ed.dataset.value;
  const setHint = () => { if (hintEl) { hintEl.innerHTML = hint; hintEl.classList.remove('is-error'); } };
  const setError = () => { if (hintEl) { hintEl.innerHTML = `<i class="icon-error" aria-hidden="true"></i>${esc(error)}`; hintEl.classList.add('is-error'); } };
  const view = () => {
    ed.replaceChildren(html(`<div class="value"><span>${esc(value)}${unit ? ' ' + esc(unit) : ''}</span><button type="button" class="button icon-only" aria-label="Edit ${esc(label)}" title="Edit ${esc(label)}"><i class="icon-edit" aria-hidden="true"></i></button></div>`));
    const b = ed.querySelector('button'); b.addEventListener('click', () => edit()); return b;
  };
  const save = async (next, draft) => {
    const old = value; value = next;
    const b = view(); b.disabled = true; b.innerHTML = ring; b.setAttribute('aria-label', 'Saving'); ed.classList.add('is-saving');
    try {
      await saveValue(next, ed);
      ed.classList.remove('is-saving'); b.disabled = false; b.innerHTML = tick; b.classList.add('is-saved'); b.setAttribute('aria-label', 'Saved'); b.focus();
      setTimeout(() => { b.innerHTML = '<i class="icon-edit" aria-hidden="true"></i>'; b.classList.remove('is-saved'); b.setAttribute('aria-label', `Edit ${label}`); }, 2000);
    } catch { ed.classList.remove('is-saving'); value = old; failed(label); edit(draft); }
  };
  const edit = (draft = value) => {
    const input = html(`<input class="input" type="${esc(type)}" aria-label="${esc(label)}" title="Enter saves, Esc cancels" required${hintEl?.id ? ` aria-describedby="${hintEl.id}"` : ''}${min ? ` min="${esc(min)}"` : ''}${pattern ? ` pattern="${esc(pattern)}"` : ''}>`);
    input.value = draft; ed.replaceChildren(input);
    let done = false;
    const commit = () => {
      if (done) return;
      const v = input.value.trim();
      if (!input.checkValidity() || !v) { input.setAttribute('aria-invalid', 'true'); setError(); input.focus(); return; }
      done = true; setHint();
      if (v === value) view(); else save(v, input.value);
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done = true; setHint(); view().focus(); }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (ed.contains(input) && document.activeElement !== input) commit(); }, 0));
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); setHint(); } });
    input.focus(); input.select();
  };
  view();
}

// Settings section: a checkbox, radio or segmented control saves on change. Disabled while saving; a spinner in its slot
// (.save-state, added here up front so nothing moves) only after FAST_MS, then a check for 2 s; a failed save puts the old
// value back and shows an error toast naming the setting.
for (const c of document.querySelectorAll('.setting-rows dd > :is(.segmented, .choice)')) if (!c.nextElementSibling?.matches('.save-state')) c.after(html('<span class="save-state" role="status"></span>'));
for (const r of document.querySelectorAll('.setting-rows input[type=radio]:checked')) r.dataset.was = '';
document.addEventListener('change', async e => {
  const input = e.target, dd = input.closest('.setting-rows dd');
  if (!dd || input.closest('.editable') || !input.matches('[type=checkbox], [type=radio]')) return;
  const ctl = input.closest('.segmented, .choice'), st = ctl.nextElementSibling, name = dd.previousElementSibling.textContent;
  const group = input.type === 'radio' ? [...dd.querySelectorAll(`input[name="${input.name}"]`)] : [input];
  const before = input.type === 'radio' ? group.find(r => r.dataset.was !== undefined) : null;
  st.innerHTML = ''; st.classList.remove('is-saved'); group.forEach(r => r.disabled = true);
  const slow = setTimeout(() => { st.innerHTML = `${ring}<span class="sr">saving</span>`; }, FAST_MS);
  try {
    try { await saveValue(input.checked, input); } finally { group.forEach(r => r.disabled = false); clearTimeout(slow); }
    st.innerHTML = `${tick}<span class="sr">saved</span>`; st.classList.add('is-saved');
    group.forEach(r => delete r.dataset.was); if (input.type === 'radio') input.dataset.was = '';
    setTimeout(() => { st.innerHTML = ''; st.classList.remove('is-saved'); }, 2000);
  } catch {
    st.innerHTML = '';
    if (input.type === 'checkbox') input.checked = !input.checked; else if (before) before.checked = true;
    failed(name);
  }
});
}
