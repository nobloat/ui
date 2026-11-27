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
