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

// message: the close button fades it out (duration-slow, ease; instant with reduced motion), then removes it
document.addEventListener('click', e => {
  const m = e.target.closest('.message > .button')?.parentElement;
  if (!m) return;
  m.classList.add('closing');
  setTimeout(() => m.remove(), parseFloat(getComputedStyle(m).transitionDuration) * 1000);
});

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
