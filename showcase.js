// page frame for foundations.html and components.html: brand picker and copy buttons
const fdBrand = document.getElementById('fd-brand');
// the picker edits the brand of the mode on screen (--brand in light, --brand-dark in dark) and shows that mode's accent
const fdDark = () => getComputedStyle(document.documentElement).colorScheme === 'dark' || (getComputedStyle(document.documentElement).colorScheme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
const fdHex = c => { const x = document.createElement('canvas').getContext('2d', {willReadFrequently: true}); x.fillStyle = c; x.fillRect(0, 0, 1, 1);
  return '#' + [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)].map(v => v.toString(16).padStart(2, '0')).join(''); };
const fdShow = () => { if (!fdBrand) return; const p = document.body.appendChild(document.createElement('i')); p.style.color = 'var(--accent)'; fdBrand.value = fdHex(getComputedStyle(p).color); p.remove(); };
fdBrand?.addEventListener('input', () => document.documentElement.style.setProperty(fdDark() ? '--brand-dark' : '--brand', fdBrand.value));
document.addEventListener('change', e => { if (e.target.name === 'theme') fdShow(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fdShow);
addEventListener('load', fdShow); // after components.js restored the saved theme
document.addEventListener('click', e => { if (e.target.closest('[data-demo-auto]')) document.getElementById('auto-demo').append(document.getElementById('auto-msg').content.cloneNode(true)); });
document.addEventListener('click', e => { const b = e.target.closest('.fd-copy'); if (!b || b.matches('[data-demo-auto]')) return;
  navigator.clipboard.writeText(b.dataset.copy ?? (b.dataset.from ? document.querySelector(b.dataset.from).outerHTML : b.textContent)).then(() => { b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 1200); }); });
