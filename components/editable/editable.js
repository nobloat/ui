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
