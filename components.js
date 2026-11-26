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

// command palette: Ctrl K opens; typing filters the rows (a group heading hides with its rows), arrows move the
// selection, Enter runs it. Rows are links or buttons, so without this script they still work by click and Tab.
for (const dlg of document.querySelectorAll('.command-palette')) {
  const input = dlg.querySelector('input'), rows = [...dlg.querySelectorAll('.menu > :is(a, button)')];
  const shown = () => rows.filter(r => !r.hidden);
  const select = r => { rows.forEach(x => x.removeAttribute('aria-selected')); r?.setAttribute('aria-selected', 'true'); r?.scrollIntoView({block: 'nearest', container: 'nearest'}); };
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach(r => r.hidden = !r.textContent.toLowerCase().includes(q));
    dlg.querySelectorAll('.menu > .group').forEach(g => { let n = g.nextElementSibling, any = false;
      while (n && !n.matches('.group')) { any ||= !n.hidden && n.matches('a, button'); n = n.nextElementSibling; } g.hidden = !any; });
    select(shown()[0]);
  };
  input.addEventListener('input', filter);
  input.addEventListener('keydown', e => {
    const s = shown(), i = s.findIndex(r => r.hasAttribute('aria-selected'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); select(s[(i + (e.key === 'ArrowDown' ? 1 : -1) + s.length) % s.length]); }
    else if (e.key === 'Enter') { e.preventDefault(); s[i]?.click(); dlg.close(); }
  });
  dlg.addEventListener('close', () => { input.value = ''; filter(); });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); dlg.showModal(); } });
  filter();
}
