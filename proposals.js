// proposals: the live "try it" specimens. Only for proposals.html; a released part moves its behaviour into ui.js.
// Editable field: Enter or leaving saves (autosave), Esc puts the old value back, an invalid value stays with its error.
for (const ed of document.querySelectorAll('.editable[data-live]')) {
  const kind = [...ed.classList].find(c => c.startsWith('e-'));
  const label = ed.querySelector('.field-label').textContent;
  let value = ed.dataset.value;
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const esc = s => s.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const pen = kind === 'e-row'
    ? `<button type="button" class="button icon-only text" data-edit><i class="icon-edit" aria-hidden="true"></i>Edit</button>`
    : `<button type="button" class="button icon-only" data-edit aria-label="Edit ${label}" title="Edit ${label}"><i class="icon-edit" aria-hidden="true"></i></button>`;
  const flash = node => { const s = el('<span class="saved"><i class="icon-check" aria-hidden="true"></i>saved</span>');
    node.querySelector('[data-edit]') ? node.querySelector('[data-edit]').before(s) : node.append(s); setTimeout(() => s.remove(), 2000); };
  const clear = () => { ed.querySelectorAll(':scope > :not(.field-label)').forEach(n => n.remove()); };
  const error = (input, msg) => { input.setAttribute('aria-invalid', 'true'); ed.querySelector('.field-error')?.remove();
    input.closest('.panel, .editable').querySelector('.field-hint')?.remove();
    input.after(el(`<span class="field-error"><i class="icon-error" aria-hidden="true"></i>${msg} <span>Esc puts the old one back.</span></span>`)); };

  const view = (saved) => {
    clear();
    if (kind === 'e-quiet') return quiet(saved);
    const v = kind === 'e-text'
      ? el(`<div class="value" tabindex="0" role="button" aria-label="${label}, ${esc(value)}, edit"><span>${esc(value)}</span></div>`)
      : el(`<div class="value"><span>${esc(value)}</span>${pen}</div>`);
    ed.append(v);
    if (saved) flash(v);
    const go = () => kind === 'e-panel' ? panel() : edit();
    v.querySelector('[data-edit]')?.addEventListener('click', go);
    if (kind === 'e-text') { v.addEventListener('click', go); v.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); }
    if (saved !== undefined) (v.querySelector('[data-edit]') || v).focus();
  };

  const wire = (input, done) => {
    let cancelled = false;
    const commit = () => { if (cancelled) return; if (!input.checkValidity() || !input.value.trim()) { error(input, 'Not an e-mail address.'); input.focus(); return false; } done(input.value.trim()); return true; };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelled = true; view(false); }
    });
    input.addEventListener('blur', () => setTimeout(() => { if (ed.contains(input) && document.activeElement !== input) commit(); }, 0));
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); ed.querySelector('.field-error')?.remove(); } });
  };

  const edit = () => {
    clear();
    const input = el(`<input class="input" type="email" value="${esc(value)}" aria-label="${label}" autocomplete="email">`);
    ed.append(input, el('<span class="field-hint">Enter saves, Esc cancels</span>'));
    if (kind === 'e-row') { input.style.gridColumn = 2; ed.lastChild.style.gridColumn = 2; }
    wire(input, v => { value = v; view(true); });
    input.focus(); input.select();
  };

  const panel = () => {
    clear();
    ed.append(el(`<div class="value"><span>${esc(value)}</span></div>`));
    const p = el(`<div class="panel"><label class="field"><span class="field-label">New ${label.toLowerCase()}</span><input class="input" type="email" autocomplete="email"><span class="field-hint">We send a link to the new address; it counts once you open it. Esc closes.</span></label></div>`);
    ed.append(p);
    const input = p.querySelector('input');
    wire(input, v => { view(false); const s = el(`<span class="field-hint">Link sent to ${esc(v)}; open it to switch.</span>`); ed.append(s); });
    input.focus();
  };

  const quiet = (saved) => {
    const input = el(`<input class="input" type="email" value="${esc(value)}" aria-label="${label}" autocomplete="email">`);
    ed.append(input);
    if (saved) { const s = el('<span class="saved"><i class="icon-check" aria-hidden="true"></i>saved</span>'); ed.append(s); setTimeout(() => s.remove(), 2000); }
    wire(input, v => { if (v !== value) { value = v; clear(); quiet(true); } });
  };

  view();
}
