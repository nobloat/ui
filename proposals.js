// proposals: the live "try it" specimens. Only for proposals.html; a released part moves its behaviour into ui.js.
// Editable field (A, pencil): Enter or leaving saves (autosave), Esc puts the old value back. Saving shows a spinner
// (a stand-in server takes about a second; a value with "fail" in it fails, to show the error), then the saved feedback.
// data-fb picks where the feedback goes: button (the pencil turns into spinner, then check), label, hint, inline, toast.
const SAVE_MS = 900;
const fake = v => new Promise((ok, no) => setTimeout(() => v.includes('fail') ? no(new Error('Could not save, the server did not answer.')) : ok(), SAVE_MS));
const node = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const ring = '<i class="busy-ring" aria-hidden="true"></i>';
const check = '<i class="icon-check" aria-hidden="true"></i>';
let toasts;
const toast = (html, state) => {
  toasts ??= document.body.appendChild(node('<div class="ed-toasts" role="status"></div>'));
  const m = node(`<div class="message" style="--c:var(--${state})">${html}<button type="button" class="button icon-only" aria-label="Close" title="Close"><i class="icon-x" aria-hidden="true"></i></button></div>`);
  toasts.append(m); m.querySelector('button').onclick = () => m.remove();
  if (state === 'ok') setTimeout(() => m.remove(), 3000);
  return m;
};

for (const ed of document.querySelectorAll('.editable[data-live]')) {
  const fb = ed.dataset.fb, label = ed.querySelector('.field-label').textContent;
  const lab = ed.querySelector('.field-label');
  let value = ed.dataset.value;
  const clear = () => { ed.querySelectorAll(':scope > :not(.field-label)').forEach(n => n.remove()); lab.querySelector('.state')?.remove(); };

  // the feedback in its place: 'saving' or 'saved'
  const show = (state, v) => {
    const msg = state === 'saving' ? `${ring}<span>saving</span>` : `${check}<span>saved</span>`;
    if (fb === 'button') {
      const b = v.querySelector('[data-edit]'); b.disabled = state === 'saving'; b.setAttribute('aria-label', state === 'saving' ? 'Saving' : 'Saved');
      b.innerHTML = state === 'saving' ? ring : check; b.classList.toggle('is-saved', state === 'saved');
      if (state === 'saved') setTimeout(() => { b.innerHTML = '<i class="icon-edit" aria-hidden="true"></i>'; b.classList.remove('is-saved'); b.setAttribute('aria-label', `Edit ${label}`); }, 2000);
    } else if (fb === 'label') {
      lab.querySelector('.state')?.remove(); const s = node(`<span class="state">${msg}</span>`); lab.append(s);
      if (state === 'saved') setTimeout(() => s.remove(), 2000);
    } else if (fb === 'hint') {
      ed.querySelector(':scope > .field-hint')?.remove();
      const s = node(`<span class="field-hint state">${state === 'saving' ? ring + '<span>Saving…</span>' : check + '<span>Saved just now</span>'}</span>`); ed.append(s);
      if (state === 'saved') setTimeout(() => s.remove(), 4000);
    } else if (fb === 'inline') {
      v.querySelector('.state')?.remove(); const s = node(`<span class="state">${state === 'saving' ? ring : check}</span>`); v.querySelector('span').after(s);
      if (state === 'saved') setTimeout(() => s.remove(), 2000);
    } else if (fb === 'toast') {
      if (state === 'saving') { v.querySelector('.state')?.remove(); v.querySelector('span').after(node(`<span class="state">${ring}</span>`)); }
      else { v.querySelector('.state')?.remove(); toast(`${check}<span>${label} saved.</span>`, 'ok'); }
    }
  };

  const view = () => {
    clear();
    const v = node(`<div class="value"><span>${esc(value)}</span><button type="button" class="button icon-only" data-edit aria-label="Edit ${label}" title="Edit ${label}"><i class="icon-edit" aria-hidden="true"></i></button></div>`);
    ed.append(v);
    v.querySelector('[data-edit]').addEventListener('click', edit);
    return v;
  };

  const save = async (next, input) => {
    const old = value;
    value = next; const v = view(); show('saving', v);
    try { await fake(next); show('saved', v); v.querySelector('[data-edit]').focus(); }
    catch (err) { value = old; edit(next, err.message); }
  };

  const edit = (draft = value, problem = '') => {
    clear();
    const input = node(`<input class="input" type="email" value="${esc(typeof draft === 'string' ? draft : value)}" aria-label="${label}" autocomplete="email">`);
    ed.append(input);
    if (problem) { input.setAttribute('aria-invalid', 'true'); ed.append(node(`<span class="field-error"><i class="icon-error" aria-hidden="true"></i>${esc(problem)} <span>Enter tries again, Esc puts the old one back.</span></span>`)); }
    else ed.append(node('<span class="field-hint">Enter saves, Esc cancels</span>'));
    let done = false;
    const commit = () => {
      if (done) return;
      const v = input.value.trim();
      if (!input.checkValidity() || !v) { if (!ed.querySelector('.field-error')) { input.setAttribute('aria-invalid', 'true'); ed.querySelector('.field-hint')?.remove();
        ed.append(node('<span class="field-error"><i class="icon-error" aria-hidden="true"></i>Not an e-mail address. <span>Esc puts the old one back.</span></span>')); } input.focus(); return; }
      done = true;
      if (v === value && !problem) { view(); return; }
      save(v, input);
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); done = true; view().querySelector('[data-edit]').focus(); }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (ed.contains(input) && document.activeElement !== input) commit(); }, 0));
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') && !problem) { input.removeAttribute('aria-invalid'); ed.querySelector('.field-error')?.remove(); } });
    input.focus(); input.select();
  };

  view();
}
