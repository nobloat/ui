// user menu: the language radios load the page again in the chosen language (?lang=); the server keeps the choice.
document.addEventListener('change', e => {
  if (e.target.name !== 'lang' || !e.target.closest('.menu, .setting-rows')) return;
  const u = new URL(location.href); u.searchParams.set('lang', e.target.value); location.assign(u);
});
