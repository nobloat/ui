// page frame for foundations.html and components.html: brand picker and copy buttons
const fdBrand = document.getElementById('fd-brand');
fdBrand?.addEventListener('input', () => document.documentElement.style.setProperty('--brand', fdBrand.value));
document.addEventListener('click', e => { const b = e.target.closest('.fd-copy'); if (!b) return;
  navigator.clipboard.writeText(b.dataset.copy ?? b.textContent).then(() => { b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1200); }); });
