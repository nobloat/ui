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

// components/otp
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

// components/theme-switch
// theme: switching is CSS (radios name=theme). This only remembers the choice where no server does (static pages):
// it restores the saved radio on load and saves it on change. Same storage key as ui.js.
{
  let saved = ''; try { saved = localStorage.getItem('theme') ?? ''; } catch {}
  const r = document.getElementById('theme-' + (saved || 'auto')); if (r) r.checked = true;
  document.addEventListener('change', e => { if (e.target.name !== 'theme') return;
    try { e.target.value === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', e.target.value); } catch {} });
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
