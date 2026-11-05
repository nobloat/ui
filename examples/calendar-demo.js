// Demo only: what an app does with calendar.js events. A real app posts to its API and re-renders the week
// (location.reload() or morph); here the boxes change in place and a toast says what would be saved.
{
  const cal = document.getElementById('cal'), dlg = document.getElementById('ev-dlg');
  const colors = {acme: '#2563eb', globex: '#db2777', intern: '#059669', hooli: '#d97706'};
  const toast = text => {
    let box = document.querySelector('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
    const p = document.createElement('p');
    p.className = 'flash ok';
    p.textContent = text;
    box.append(p);
    setTimeout(() => p.remove(), 3000);
  };
  const min = t => +t.slice(0, 2) * 60 + +t.slice(3);
  let n = 100;

  // cal:create → the app's form, prefilled; the dashed box stays until it closes
  cal.addEventListener('cal:create', e => {
    const f = dlg.querySelector('form');
    f.reset();
    f.date.value = e.detail.date; f.start.value = e.detail.start; f.end.value = e.detail.end;
    dlg.returnValue = ''; // Discard and Esc close without a value
    dlg.showModal();
  });
  dlg.addEventListener('close', () => {
    cal.querySelector('.ev.draw')?.remove();
    if (dlg.returnValue !== 'save') return;
    const f = dlg.querySelector('form'), day = cal.querySelector(`.day[data-date="${f.date.value}"]`);
    if (!day) { toast(`demo: POST /entries ${f.date.value} (another week)`); return; }
    const a = document.createElement('a'), s = min(f.start.value), l = Math.max(min(f.end.value) - s, 15);
    a.className = 'ev'; a.href = '#entry-' + ++n; a.dataset.id = n;
    a.style.cssText = `top:${s / 14.4}%;height:${l / 14.4}%;--c:${colors[f.project.value]}`;
    a.innerHTML = '<b></b><small></small><span class="grip" aria-hidden="true"></span>';
    a.querySelector('b').textContent = f.project.selectedOptions[0].text;
    a.querySelector('small').textContent = f.desc.value;
    day.append(a);
    toast(`demo: POST /entries ${f.date.value} ${f.start.value}–${f.end.value}`);
  });
  cal.addEventListener('cal:change', e => toast(`demo: POST /entries/${e.detail.id} ${e.detail.date} ${e.detail.start}–${e.detail.end}`));
  cal.addEventListener('cal:open', e => { e.preventDefault(); toast(`demo: open /entries/${e.detail.id}`); });
  cal.addEventListener('cal:delete', async e => {
    if (await confirmDlg('Delete this entry?')) { e.detail.el.remove(); toast(`demo: DELETE /entries/${e.detail.id}`); }
  });
}
