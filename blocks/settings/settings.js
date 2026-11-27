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
