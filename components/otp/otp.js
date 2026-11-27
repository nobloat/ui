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
