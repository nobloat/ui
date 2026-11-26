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
