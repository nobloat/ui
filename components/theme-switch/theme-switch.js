// theme: switching is CSS (radios name=theme). This only remembers the choice where no server does (static pages):
// it restores the saved radio on load and saves it on change. Same storage key as ui.js.
{
  let saved = ''; try { saved = localStorage.getItem('theme') ?? ''; } catch {}
  const r = document.getElementById('theme-' + (saved || 'auto')); if (r) r.checked = true;
  document.addEventListener('change', e => { if (e.target.name !== 'theme') return;
    try { e.target.value === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', e.target.value); } catch {} });
}
