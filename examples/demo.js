// Demo only, not part of nobloat/ui: the design / theme / brand / logo switcher and a fake backend,
// so the examples work as plain files. URL parameters (?design=ink&theme=dark&brand=%23c2410c&logo=1)
// override and are remembered across pages; screenshots.sh and preview.html use them.
{
  const root = document.documentElement, KEY = 'nb-demo';
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  const params = new URLSearchParams(location.search);
  for (const [k, v] of params) if (['design', 'brand', 'logo'].includes(k)) s[k] = v;
  const defaults = {'': '#0969da', nordic: '#3b6e94', ink: '#c2410c', bw: '#000000', terminal: '#b45309', modern: '#4f46e5'};
  const logoHTML = document.querySelector('.logo')?.innerHTML;
  const apply = () => {
    s.design ? root.dataset.design = s.design : delete root.dataset.design;
    if (params.get('theme')) root.dataset.theme = params.get('theme'); // pins this page only (screenshots); the toggle is the real control
    s.brand ? root.style.setProperty('--brand', s.brand) : root.style.removeProperty('--brand');
    const logo = document.querySelector('.logo');
    if (logo) logo.innerHTML = s.logo === '1' ? '<img class="light" src="acme.svg" alt=""><img class="dark" src="acme-dark.svg" alt="">' : logoHTML;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  };
  apply();

  const panel = document.createElement('form');
  panel.id = 'demo';
  panel.setAttribute('aria-label', 'demo settings');
  panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:70;display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;padding:.5rem .7rem;font-size:.8rem;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:0 6px 24px rgb(0 0 0 / .15)';
  panel.innerHTML = `<span class="muted">demo</span>
    <select name="design" aria-label="design"><option value="">plain</option><option value="nordic">nordic</option><option value="ink">ink</option><option value="bw">b/w</option><option value="terminal">terminal</option><option value="modern">modern</option></select>
    <input type="color" name="brand" aria-label="brand color" title="--brand" style="padding:0;width:2rem;height:1.6rem">
    <button type="button" name="reset" title="design default color">↺</button>
    <label><input type="checkbox" name="logo"> custom logo</label>`;
  const sync = () => { panel.design.value = s.design || ''; panel.brand.value = s.brand || defaults[s.design || '']; panel.logo.checked = s.logo === '1'; };
  panel.onchange = () => { s.design = panel.design.value; s.logo = panel.logo.checked ? '1' : ''; s.brand = panel.brand.value === defaults[s.design] ? '' : panel.brand.value; apply(); sync(); };
  panel.reset.onclick = () => { s.brand = ''; apply(); sync(); };
  panel.onsubmit = e => e.preventDefault();
  const framed = window !== top; // inside preview.html, which has its own controls
  if (params.has('nopanel') || framed) panel.hidden = true;
  // tell preview.html where this frame went, so the other frame follows (works across file:// origins)
  if (framed) {
    const own = new URLSearchParams(location.search);
    for (const k of ['design', 'brand', 'logo', 'theme', 'nopanel']) own.delete(k);
    parent.postMessage({page: location.pathname.split('/').pop() + (own.size ? '?' + own : '')}, '*');
  }
  document.body.append(panel);
  sync();

  // fake backend: live search answers from a fixed list, every POST "succeeds"
  const data = {customers: [['ACME GmbH', 'K-0042'], ['Globex AG', 'K-0017'], ['Initech', 'K-0031'], ['Umbrella KG', 'K-0008'], ['Hooli e.U.', 'K-0051']],
    invoices: [['2026-0042', 'ACME GmbH'], ['2026-0041', 'Hooli e.U.'], ['2026-0031', 'ACME GmbH'], ['2026-0017', 'Globex AG']]};
  const real = fetch;
  window.fetch = async (url, opt = {}) => {
    const u = new URL(url, 'http://x');
    if (u.pathname === '/api/search') {
      const q = u.searchParams.get('q').toLowerCase(), out = {};
      for (const [g, rows] of Object.entries(data)) out[g] = rows.filter(r => r.join(' ').toLowerCase().includes(q)).map(([title, sub]) => ({url: 'detail.html', title, sub}));
      return new Response(JSON.stringify(out));
    }
    if ((opt.method || 'GET') === 'POST') return new Response('{}');
    return real(url, opt);
  };
  const toast = text => {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
    const p = document.createElement('p');
    p.className = 'flash ok';
    p.textContent = text;
    box.append(p);
    setTimeout(() => p.remove(), 3000);
  };
  // forms and server links have no server here: show what would happen instead
  document.addEventListener('submit', e => {
    const f = e.target;
    if (e.defaultPrevented || f.method === 'dialog' || f === panel) return;
    e.preventDefault();
    setTimeout(() => { e.submitter?.removeAttribute('aria-busy'); f.closest('dialog')?.close(); toast(`demo: ${f.method.toUpperCase()} ${f.getAttribute('action')}`); }, 800);
  });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="/"], a[href="#"]');
    if (a && !e.defaultPrevented) { e.preventDefault(); toast('demo: ' + a.getAttribute('href')); }
  });
}
