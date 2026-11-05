// nobloat/ui v1 calendar (optional): copy to web/static/calendar.js on pages with a week or month grid, after ui.js.
// Generic version of track's week calendar. It moves boxes and reports; the app saves and re-renders:
//   #cal fires cal:create {date, start, end}          drawn or clicked on an empty slot (start/end "HH:MM")
//              cal:change {id, date, start, end, el}  moved or resized (by pointer or J/K, Alt+J/K)
//              cal:open   {id, el}                    click or Enter on an entry (default: follow its href)
//              cal:delete {id, el}                    Del or Backspace on the selected entry
// call event.preventDefault() on cal:open to handle it yourself. Read-only entries: [data-ro]; closed days: [data-closed].
// Without JS every entry is a link and the page offers a "new" link: nothing depends on this file.
{
  const $ = (s, el = document) => el.querySelector(s);
  const cal = $('#cal');
  const snap = +(cal?.dataset.snap || 15);
  const phone = () => matchMedia('(max-width: 40rem)').matches;
  const pad = n => String(n).padStart(2, '0');
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const minOf = (day, y) => { const r = day.getBoundingClientRect(); return clamp(Math.round((y - r.top) / r.height * 1440 / snap) * snap, 0, 1440); };
  const top = el => Math.round(parseFloat(el.style.top) / 100 * 1440);
  const len = el => Math.round(parseFloat(el.style.height) / 100 * 1440);
  const place = (el, start, l) => { el.style.top = start / 14.4 + '%'; el.style.height = Math.max(l, snap) / 14.4 + '%'; };
  const fire = (type, detail) => cal.dispatchEvent(new CustomEvent('cal:' + type, {detail, cancelable: true, bubbles: true}));
  const span = (date, s, l) => ({date, start: hhmm(s), end: hhmm(Math.min(s + l, 1440))});

  let sel = null;
  const select = ev => {
    cal.querySelectorAll('.ev.sel').forEach(e => e.classList.remove('sel'));
    sel = ev;
    ev?.classList.add('sel');
    ev?.scrollIntoView({block: 'nearest'});
  };
  const all = () => [...cal.querySelectorAll('.ev:not(.draw)')].sort((a, b) =>
    a.closest('.day').dataset.date.localeCompare(b.closest('.day').dataset.date) || top(a) - top(b));
  const open = ev => { if (fire('open', {id: ev.dataset.id, el: ev}) && ev.href) location = ev.href; };
  const draft = (day, s, l) => { // the dashed box shown until the app answers cal:create
    cal.querySelectorAll('.ev.draw').forEach(b => b.remove());
    const b = document.createElement('div');
    b.className = 'ev draw';
    day.append(b);
    place(b, s, l);
    b.textContent = hhmm(s) + '–' + hhmm(Math.min(s + l, 1440));
    return b;
  };
  const create = (day, s, l) => { draft(day, s, l); fire('create', span(day.dataset.date, s, l)); };
  const change = (ev, s, l) => fire('change', {id: ev.dataset.id, el: ev, ...span(ev.closest('.day').dataset.date, s, l)});

  // pointer: draw on empty space, drag to move, drag the bottom grip to resize, click to open; touch only taps and swipes
  let drag = null;
  if (cal) {
    cal.addEventListener('pointerdown', e => {
      const day = e.target.closest('.day'), ev = e.target.closest('.ev:not(.draw)');
      if (e.button || !day) return;
      const touch = e.pointerType === 'touch';
      if (ev) {
        if (ev.hasAttribute('data-ro')) return;
        e.preventDefault();
        drag = {mode: e.target.classList.contains('grip') ? 'resize' : 'move', ev, day, x: e.clientX, y: e.clientY, touch,
          offset: minOf(day, e.clientY) - top(ev), start: top(ev), len: len(ev)};
      } else if (!day.hasAttribute('data-closed')) {
        drag = {mode: 'draw', day, x: e.clientX, y: e.clientY, from: minOf(day, e.clientY), touch};
        if (!touch) e.preventDefault();
      }
    });
    addEventListener('pointermove', e => {
      if (!drag || (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5)) return;
      if (drag.touch) { // swipe left/right on a phone: next/previous day
        if (phone() && Math.abs(e.clientX - drag.x) > 60 && Math.abs(e.clientY - drag.y) < 40) { shiftDay(e.clientX < drag.x ? 1 : -1); drag = null; }
        return;
      }
      drag.moved = true;
      if (drag.mode === 'draw') {
        const m = minOf(drag.day, e.clientY);
        drag.start = Math.min(m, drag.from); drag.len = Math.max(Math.abs(m - drag.from), snap);
        draft(drag.day, drag.start, drag.len);
      } else if (drag.mode === 'move') {
        const day = document.elementFromPoint(e.clientX, e.clientY)?.closest('#cal .day:not([data-closed])') || drag.day;
        if (day !== drag.ev.parentElement) day.append(drag.ev);
        drag.day = day;
        drag.start = clamp(minOf(day, e.clientY) - drag.offset, 0, 1440 - snap);
        place(drag.ev, drag.start, drag.len);
      } else {
        drag.len = Math.max(minOf(drag.day, e.clientY) - drag.start, snap);
        place(drag.ev, drag.start, drag.len);
      }
    });
    addEventListener('pointerup', e => {
      const d = drag;
      drag = null;
      if (!d) return;
      if (d.touch && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return; // a scroll, not a tap
      if (d.mode === 'draw') d.moved ? create(d.day, d.start, d.len) : create(d.day, Math.floor(d.from / 60) * 60, 60);
      else if (!d.moved) { select(d.ev); open(d.ev); }
      else change(d.ev, d.start, d.len);
    });
    cal.addEventListener('click', e => { if (e.target.closest('.ev:not([data-ro])')) e.preventDefault(); });
  }

  // phone: the week shows one day (.cur); h/l, swipe or the arrows switch it, past the ends to the previous/next week
  const shiftDay = dir => {
    const days = [...cal.querySelectorAll('.day')], i = days.indexOf($('.day.cur', cal)) + dir;
    if (i < 0 || i >= days.length) { const a = $(dir < 0 ? '#prevday' : '#nextday'); if (a) location = a.href; return; }
    cal.querySelectorAll('.cur').forEach(el => el.classList.remove('cur'));
    days[i].classList.add('cur');
    $(`.hd[data-date="${days[i].dataset.date}"]`, cal)?.classList.add('cur');
    label();
  };
  const label = () => { const h = $('.hd.cur', cal), l = $('#daylabel'); if (h && l) l.textContent = [...h.children].map(c => c.textContent.trim()).filter(Boolean).join(' · '); };
  document.addEventListener('click', e => {
    const b = e.target.closest('#prevday, #nextday');
    if (b && cal && phone()) { e.preventDefault(); shiftDay(b.id === 'nextday' ? 1 : -1); }
  });

  // month: a day cursor, Shift+h/j/k/l or arrows, Enter opens the day's link
  const cells = [...document.querySelectorAll('.month a.c')];
  let ci = Math.max(0, cells.findIndex(c => c.classList.contains('today')));
  const markDay = () => cells.forEach((c, n) => c.classList.toggle('sel', n === ci));
  const mv = d => () => { ci = clamp(ci + d, 0, cells.length - 1); markDay(); };

  const nav = dir => { const l = all(), i = l.indexOf(sel); if (l.length) select(l[i < 0 ? (dir > 0 ? 0 : l.length - 1) : clamp(i + dir, 0, l.length - 1)]); };
  const nudge = (ds, dl) => { if (sel && !sel.hasAttribute('data-ro')) { const s = clamp(top(sel) + ds, 0, 1440 - snap), l = Math.max(len(sel) + dl, snap); place(sel, s, l); change(sel, s, l); } };
  const click = k => $(`[data-key="${k}"]`)?.click();
  window.pageKeys = Object.assign(window.pageKeys || {}, cal ? {
    j: () => nav(1), k: () => nav(-1),
    J: () => nudge(snap, 0), K: () => nudge(-snap, 0), 'A-j': () => nudge(0, snap), 'A-k': () => nudge(0, -snap),
    h: () => phone() ? shiftDay(-1) : click('h'), l: () => phone() ? shiftDay(1) : click('l'),
    Enter: () => sel && open(sel),
    Delete: () => sel && !sel.hasAttribute('data-ro') && fire('delete', {id: sel.dataset.id, el: sel}),
    Backspace: () => window.pageKeys.Delete(),
    c: () => { // new entry now, in today's column (or the first open day at 9:00)
      const today = $('.hd.today', cal), day = today ? $(`.day[data-date="${today.dataset.date}"]`, cal) : $('.day:not([data-closed])', cal);
      if (!day || day.hasAttribute('data-closed')) return false;
      const now = new Date(), s = today ? Math.floor((now.getHours() * 60 + now.getMinutes()) / snap) * snap : 540;
      create(day, s, 60);
      $('.ev.draw', cal)?.scrollIntoView({block: 'center'});
    },
    Escape: () => { const d = $('.ev.draw', cal); if (d) d.remove(); else if (sel) select(null); else return false; },
  } : cells.length ? {H: mv(-1), L: mv(1), J: mv(7), K: mv(-7), ArrowLeft: mv(-1), ArrowRight: mv(1), ArrowDown: mv(7), ArrowUp: mv(-7),
    Enter: () => { location = cells[ci].href; }} : {});
  if (cells.length) markDay();

  // start: scroll the week to the working day (data-daystart, minutes) or the selected entry
  const wrap = $('#calwrap');
  if (wrap && cal) {
    const s = $('.ev.sel', cal);
    if (s) { sel = s; s.scrollIntoView({block: 'center'}); }
    else wrap.scrollTop = (+(wrap.dataset.daystart || 480) / 1440) * $('.day', cal).getBoundingClientRect().height;
    label();
  }
}
