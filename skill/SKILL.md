---
name: nobloat-ui
description: How every nobloat app looks and behaves: the shared nobloat/ui reference (ui.css, ui.js, calendar.js, chart.go, Go template partials, example pages) and its rules for layout, light/dark, mobile, accessibility (WCAG 2.2 AA), navigation, forms with autosave, actions and icons, money, dates, ids, tags, dashboards and charts, keyboard and command palette. Use when building, changing or reviewing any page, template, style or front-end behavior of a nobloat app, or when starting a new nobloat app's UI.
---

# nobloat-ui

The UI of nobloat apps comes from one reference repo, **nobloat/ui** (checked out next to the app as `../ui`; this skill is `../ui/skill/SKILL.md`). It is copied, never imported: no build step, no npm, no web fonts, no icon or chart library. Live gallery: https://nobloat.github.io/ui/ (and `examples/preview.html` for desktop and phone side by side).

Before writing a page, open the nearest example in `../ui/pages/` (gallery `index`, `dashboard`, `list`, `detail`, `form`, `dates`, `week`, `month`, `settings`, `status`, `login`) and copy its structure. Everything below is enforced by `node ../ui/check.mjs` where it can be checked by a machine.

Design system work (foundations, components, templates; worked out in `../ui/foundations.html`) follows [`design-system.md`](design-system.md).

## Setup in an app

1. Copy unchanged into the app: `ui.css`, `ui.js` → `web/static/`; `partials.html` → `web/`; `calendar.js` only for calendar pages; `chart.go` only for charts (change the package line, register `Spark`/`Columns` as template funcs). Merge `i18n/{en,de}.json` into the app's i18n files. Copy `favicon.svg` and replace the character and color.
2. A diff against `../ui` must stay empty. App styles go in `web/static/app.css` (via `{{define "head"}}`), app code in `app.js` (via `{{define "scripts"}}`). A change two apps need goes into nobloat/ui first, then into both apps.
3. Parse `partials.html` before the pages; every page is `{{template "nb-layout" .}}` + `{{define "main"}}` (public pages: `nb-bare`). The page value needs the fields listed at the top of `partials.html` (`Lang`, `Title`, `Here`, `Brand`, `Nav`, `Crumbs`, `Search`, `SearchAPI`, `User`, `UserURL`, `LogoutURL`, `SettingsURL`, `Texts`, `T(key)` …).
4. Add the check to the app's tests or CI: `node ../ui/check.mjs http://localhost:PORT/ /customers /customers/CUS-0042 …` (every page type once, with realistic data). It must report 0 problems.

## Look and theming

- Monospace, thin rules, color only where it means something. Two designs, set on `<html data-design>`:
  - **graphite** (no attribute): pencil on drafting paper. Dense lists with hairline rows, neutral pencil greys, large semibold titles, small uppercase section labels, surfaces only where they group (tiles, cards, charts, dialogs, `.panel`), one filled primary button. The default for every app.
  - **paper** (`data-design="paper"`): a form on paper, drawn and filled in by hand, tidy. Pen strokes instead of printed rules (gently wobbling lines), outlines with uneven corners, green-bar rows, pen blue, a highlighter on the active and selected, wavy underlines, chips circled with the pen.
  No other designs; both are finished in light, dark and on phones. `Brand.Design` (the app's `design` setting) is the default; every user can pick the other one on the settings page (`nb-prefs`) or in the palette, stored in `localStorage` like the theme.
- One knob per app: `--brand` (`Brand.Color`). Dark mode derives its own shade; `--brand-dark` overrides. `--brand` needs 4.5:1 on the light background, its dark shade on the dark one.
- Custom brand: `Brand.Logo` plus `Brand.LogoDark` (CSS shows the dark one whenever the page is dark, also when pinned), `Brand.Name` for title and label. The footer always credits `nobloat/<app>`.
- Colors only through tokens (`--fg --muted --line --chip --sel --accent --bg`) or `light-dark()`. A bare hex in `app.css` is a bug. Never `prefers-color-scheme` in CSS (ignores the pinned theme). State colors `--green --yellow --red --blue --grey` mean state and nothing else; as text use `color: var(--c-text)` with `--c` set.

## Light and dark

Both first-class. The page follows the OS; the theme row in the user menu or on the settings page (`nb-prefs`) pins light or dark in `localStorage`, applied in `<head>` before first paint. Check every page in both.

## Mobile

Works at 320–500 px without sideways scrolling or zoom; the breakpoint is 40rem.
- Header: logo, a search icon (opens the search over the header), the user menu, ☰ for the nav as a vertical list. The user menu is the same as on desktop.
- Tables become one card per row with "label … value" lines (labels from `<thead>`, set by ui.js; all columns shown, numbers right). A table that must stay a table gets `class="keep"`. Short lists of objects use a row list instead (see Data display), not a table that turns into tall cards.
- Forms one column; overflow menus become a bottom sheet; toasts full width at the bottom.
- Create, edit, delete and copy buttons show only their icon; the text stays for screen readers. The page's primary action (`.pri`) keeps its text and spans the full width, in the page head (under the title) and at a form's end. A page form's Cancel (`class="cancel"`, a link to where the user came from) is hidden: "← parent" and Back do the same; a dialog keeps its Cancel.
- Every shortcut also has a visible control (a button, a menu item or a palette row); the palette is in the user menu. Phones show no key hints.

## Accessibility (WCAG 2.2 AA, checked)

- Contrast: text 4.5:1 (3:1 from 24px or 18.66px bold), state graphics and field edges 3:1, placeholders 4.5:1. Muted text included.
- Every control has a name (visible label, `aria-label`, or `title`); every image `alt` (decorative `alt=""`); ids unique; one `main`, one `h1` per page; `lang` and a title.
- Targets at least 24×24 px or spaced; visible keyboard focus everywhere (`:focus-visible` outline, fields show it on their border); a skip link; dialogs are native `<dialog>`.
- Never color alone: a state is a dot or glyph with `role="img" aria-label`, plus a word nearby. Respect `prefers-reduced-motion`.

## Navigation

- Header (`nb-header`): logo, search (its placeholder names `Ctrl K` for the palette), and the **user menu**: a round button with the user's initial that opens a menu with the name, theme (auto/light/dark), language, settings, commands (the palette), shortcuts (`?`) and sign out (a POST form to `LogoutURL`: a GET link or image must never sign anyone out; auth accepts the POST from the apps' origins). Nothing else sits loose in the header: no palette button, no language links, no theme button, no ⚙ or ⏻. Settings is never a nav item; a logout on the settings page is the same POST form.
- Nav: the app's main object types, each with a `g`+letter key (`Nav[].Key`; on desktop the link shows it as `g d`, and `?` lists it). An app whose own sidebar already navigates (jot) leaves `Nav` empty: one way to get somewhere. Its sidebar gets `id="nav"` (☰ opens it on phones) and its links `data-g` keep the `g`+letter keys.
- Breadcrumbs (`Crumbs`) on every page below the top level: parent links, the current page last without link. `Esc` goes one up; phones show "← parent".
- Command palette on every page (built into ui.js): `Ctrl+K` / `⌘K` / `:`. An app without one (call) sets `<body data-nopalette>` (`{{define "bodyattr"}} data-nopalette{{end}}` with the partials): no palette, no `Ctrl K` hint, no row in `?`. It lists nav, header links, every visible `[data-key]` action of the page, theme and help; apps add commands with `window.commands = [{label, sub, run}]`; unknown input falls back to search.
- Search: `/` focuses it; with `SearchAPI` it searches live, grouped by type; an exact id opens the object.

## Deep links: the URL is the UI state

Everything a user can set up or open is in the URL, so reload, Back, a bookmark or a link sent to a colleague shows exactly the same view. Not in the URL: personal preferences (theme, design, language: settings), secrets, passing things (hover, focus).
- **Query (server renders it, works without JS):** search `q`, filters (`state`, `tag`, chips are links), sort (`sort`, `dir`), page, tab, period/range, calendar week and month, chart range. Every control that changes the view is a link or a GET form, never a JS-only toggle. Defaults are omitted (`?sort=name` only when it is not the default).
- **Prefill:** create forms take their fields from the query: `/customers?name=ACME&email=…#new` opens "New customer" filled in. The server renders the values; `form[data-prefill="name email"]` covers dialogs and static pages and fills only the listed fields (a bare `data-prefill` fills only free-text fields, never selects, checkboxes, radios or pills). A link must never choose roles, groups or permissions: leave those out of the list. Prefilled values get the focus instead of the submit button. Other apps and mails link this way instead of copying data.
- **Hash (ui.js keeps it in sync with `history.replaceState`, no extra history entries):** the open dialog (`#new`, closing removes it), the selected row (`#CUS-0042`: rows carry their object id as `id`), the day shown on a phone in the week calendar (`#2026-11-05`), an anchor in a long page.
- **Sortable columns:** the header is a link (`<th aria-sort="ascending"><a href="?sort=name&dir=desc">name</a></th>`); one click sorts, a second reverses; the current column shows ↑/↓.
- Objects have one canonical URL with their id (`/customers/CUS-0042`); a POST answers with a redirect to a URL that shows the result (no "resubmit?").

## Ids

Every object a user can find or open has an id as a ticket key: a type key of 3 uppercase letters, a hyphen, the number or slug in uppercase: `CUS-0042`, `INV-2026-0042`, `PRJ-WEBSITE`, `USR-7F3A9C`, `KEY-9C1A`, `ERR-7F3A9C12`. Each type key means one thing across all nobloat apps; search matches ids case-insensitively. Shown as `<code class="id">` with a copy button, used in URLs, search results, logs, mails. Legal or human numbers (invoice number 2026-0042) are separate fields.

## Page anatomy

- `.pagehead`: `h1` and the page's actions, right of the title (on phones under it). Actions never sit alone at the bottom of a page; only a form's own submit sits at the form's end. Lists: chips with counts and colored tags above, table, `.pager` (`p`/`n`) or filters, `.empty` with the create action when empty. Detail: crumbs, title with state, actions (primary visible; a `details.more` menu only from three further actions on, one or two are plain buttons next to it), tags, `.info` grid with copyable ids (one or two self-explanatory facts, such as a link and a count, are a muted line instead of a label grid), tabs, history in `details.audit`.
- Dashboard (`dashboard` example): stat tiles first, but only for numbers that lead to an action (`.tiles > a.tile`: label, value, delta, sparkline or meter; each tile links to its list; a tile that repeats the list below it or a count nobody acts on is left out, and an app without such numbers has no tiles), then "needs attention" (actionable rows with a button), then one or two charts, then recent activity. Only what the user acts on; no decoration.
- Settings (user menu): account from the sign-in (name, username, email, groups, role, IdP, session, user id, link to manage the account, logout), preferences (`nb-prefs`: language, theme, design), then app settings, users, keys.

## Actions and icons

- **Icons** come from the nobloat/ui set only (`icons/`, see the Icons example page): one class, `<i class="icon-cog" aria-hidden="true"></i>`, sized by the font, tinted by `color`. No other icon sets, no emoji, no Unicode glyphs as icons. The style is "precise": 16×16, 1.25 stroke, square ends, sharp joins, currentColor. A missing icon is added to nobloat/ui first (README: Adding an icon), never drawn inside an app.
- **Every button and `.btn` has an icon, no exceptions**: actions, dialog OK and Cancel, Close, tabs, pager, chips, menu items, icon-only header and row buttons (with `aria-label`); the icon comes before the text. `check.mjs` fails a visible `button` or `.btn` without one (an `<i class="icon-…">` or a class that draws one: `new`, `edit`, `del`, `copy`, `ico`). Also: links out (`icon-external` after the text), messages (`info`, `warning`, `error`, `ok`), state next to its word, units in `.affix`, empty states. Plain links in text and form labels get none. The same action has the same icon everywhere: `dice` makes a random name or id (a funny guest name, a room, a share id), `refresh` reloads or retries; `check` confirms, `x` cancels and closes.
- **Which icon** (the same meaning, the same icon, in every app):
  - actions: save, OK, continue, confirm, submit `check` · cancel, close, clear, dismiss `x` · back `arrow-left` · go on, next step `arrow-right` · add, new `plus` · delete `trash` · archive `archive` · edit, rename `edit` · copy `copy` · reset, discard, undo `undo` · retry, reload, sync `refresh` · random name or id `dice` · upload, choose files `upload` · download, export `download` · send, remind `send` · comment `chat` · preview, show `eye` · print `print` · merge `merge` · sign in `log-in` · sign out `log-out` · lock, close a period `lock` · reopen `unlock` · filter, clear filters `filter` · search `search` · help, shortcuts `help` · more `more`
  - places and tabs: dashboard `dashboard` · list `list` · board `columns` · calendar, week, month, year, date range `calendar` · today, time, hours, durations `clock` · account, person, me `user` · people, users, customers `users` · nobody, unassigned `user off` · company `building` · project, folder `folder` · tag, class, category `tag` · settings, general `cog` · API keys `key` · money, invoices, bank `euro` · document, text, raw `file` · HTML, source `code` · language `globe` · reports, figures `chart` · mail, newsletter `mail` · apps, home `home` · link `link`
  - states (chips): all `list` · active, open, done `ok` · waiting, paused `pause` · overdue, unpaid, failed `warning` · archived `archive`
  - a chip that names data (a company, a year, a person) carries its kind's icon, on every chip
- Create, edit, delete and copy buttons always carry their icon: `class="new"`, `edit`, `del`, `copy` (on `button` or `.btn`). `.new` means "create an object"; adding a row or a value inside a form ("+ time", "Add dates") is a plain button with `<i class="icon-plus">` or a fitting icon and its text, so phones do not show several identical bare "+"; icon-only links `class="round ico cog"` etc. with `aria-label`. `.del` is red; every delete or public action has `data-confirm="…"` naming the object and the consequence, optionally with `data-confirm-title="Delete ACME GmbH?"` as the question and the text as the consequence. Dialogs always have an `h2` title (`aria-labelledby`).
- A primary action per page (`.pri`), at most one. Every submit shows a spinner (`aria-busy`, automatic); ui.js drops a second submit of the same form within 3 s and a held `[data-key]` clicks once. Mutations that must not happen twice still need an idempotency check on the server.
- Shortcuts: `c` create, `e` edit, `Del` delete where it makes sense. **On desktop a button or `.btn` with a key shows it**: `data-key="c"` is the one source, ui.js adds the `<kbd>` where the markup has none; a round icon-only button names the key in its tooltip (`title="Mute (m)"`). Tabs, pager, chips and labels show none (their keys are positional and in `?`). Phones hide every hint. Palette rows and menu rows (user menu, `details.more`) show their key too.
- **`?` lists only what works here and now.** Each row of the help can carry `data-needs="<selector>"`; ui.js hides it when nothing visible matches (`j k` and `Enter` need rows, `h l` `.tabs`, `p n` `.pager`, `1…9` `.chips`, `x` the bulk checkboxes, the palette row needs a palette). A page's own rows come from `{{define "help"}}` with their own `data-needs` (call: `m v s…` need `#call:not([hidden])`, not the join screen); a section left empty disappears, "On this page" included.

## Bulk actions

Lists where users act on many objects get a checkbox column: `th.pick` with `input[data-all]`, `td.pick` with `input name="ids" value="CUS-…" form="bulk"`, and `<form id="bulk" class="bulkbar" method="post">` with one button per action (`name="do" value="archive"`). ui.js hides the bar until something is selected, shows "{n} selected", `x` toggles the cursor row, `Esc` clears; destructive buttons carry `data-confirm-n="Archive {n} customers? …"`. Without JS the bar is always there and posts the checked ids.

## Forms

- **Edit forms autosave**: `form[data-autosave]`, every change is posted (JSON answer `{rev}` or 4xx `{error, field, hint}`). Saved state is quiet: the field edge flashes once and `.saved` says "✓ saved 14:02"; never a toast. The submit button is `.nojs` (the no-JS path). Concurrent edits use a `rev` field. ui.js sends one save per form at a time (a change meanwhile follows with the new `rev`), sends nothing while a field is invalid, and on `409` offers a reload.
- **Create** cannot autosave (no object yet): a small form (dialog or page) with only the required fields and one `+ Create` button, then the user continues on the autosaving edit form.
- **Errors** sit right under the field in one short line: the field gets `aria-invalid`, and `<span class="err">what is wrong<span class="valid">what is valid, with an example</span></span>` reads "Not a valid VAT id: ATU and 8 digits, e.g. ATU12345678". No second line, no explanation beyond the valid form. The server renders the same markup without JS; ui.js shows the browser's own checks (`required`, `pattern` + `title`, `type`, `min`/`max`) the same way. Every pattern has a `title` that names a valid example.
- **Uploads**: a drop zone, `<label class="drop">` around `<input type="file" accept="…" data-max="bytes">` with an upload icon, "Drop … here or choose", and always the supported files and the size limit in `<small>`. ui.js highlights every zone while files are dragged over the window, says "release to add n files" over a zone, refuses what `accept`/`data-max` exclude with a field error, and lists the files with their sizes. A single file can be a button: `<label class="btn"><i class="icon-upload"></i> Upload logo <input type="file"></label>` with the supported files next to it. The server checks type and size again. Inside a `data-autosave` form the file is posted as multipart with the rest of the form; the server must accept `multipart/form-data` there.
- Single choice: `.seg` radios or `select`; several values: `data-pick` with a `datalist` (a space-separated text field without JS; ui.js shows the values as pills with × and suggests the rest); one value with suggestions: native `list`.

## Errors and the session

- Error pages keep the app's header and nav (`nb-layout`) so the user can go on: the code small, the message as `h1` in plain words, what happened to their work, and buttons for what to do next (`pages/404.html`, `403.html`, `500.html`). Never a stack trace.
- 404 for objects that do not exist **and** for objects the user may not see (no hint that they exist); 403 only for pages or sections the role cannot use, naming the signed-in user, their groups and who can grant access.
- 500: say whether the last change was saved, and show a reference id (`ERR-…`, also in the log) with a copy button.
- Session: `SessionEnd` (and `SessionRenew`, a GET that extends it and answers `{end}`) on the page; ui.js shows a bar 5 minutes before the end ("Stay signed in") and after it ("sign in again to save", in a new tab). The page keeps all input; autosave answers 401 the same way instead of a field error.

## Data display

- **Money**: integer cents on the server, format configured by example (`1.234,56`, `{amount} {symbol}`). Always with the currency. `<data class="money" value="cents">`. No sign: neutral (prices, totals, balances). Explicit `+` green (`.pos`), explicit `−` red (`.neg`), a real minus sign. Inputs: `.affix` with the unit and `data-money="1.234,56"` (accepts both conventions, rewrites to the example, refuses the rest with a hint). A single separator with three digits follows the example: with `1.234,56`, `1.500` is 1500 and `0,125` is refused, never read as 125.
- **Dates**: always shown and typed as dd.mm.yyyy, times as hh:mm (24 h), in text fields with a pattern and a sample as placeholder; a button opens the browser’s own picker (JavaScript) and writes the choice back. ISO on the wire. Lists show dates as dd.mm.yyyy; recent events relative with the exact time in `title`; durations `h:mm`. Ranges: preset chips (links) plus a from–to form.
- **Tags**: `a.tag`; a user-chosen color is `style="--c:#…"` (tinted pill, text keeps full contrast), picked from `.swatches` (preset colors safe on light and dark, plus a `value="custom"` radio and a native `input[type=color] name="custom"`; the server takes `custom` when that radio is checked).
- **Lists**: a `table` when people compare values across columns (sortable, many rows, money); a row list `ul.rows` for short lists of objects with a few short facts: `<li id="PRJ-WEBSITE" data-href="…">` with a `.dot`, `a.main` (the title, shortened with …), `.meta` (muted: who · when), `.num`, row buttons. One hairline row each; on phones `.meta` moves to a second line instead of a card per row. `j`/`k`, `Enter` and the selected row (`#id`) work as in tables.
- **Status**: `.dot.ok/.pend/.bad/.run/.off` or `.st` glyphs, always labeled.
- **Messages**: `.flash` (error), `.flash.ok`, `.warn`, `.banner` (info); one sentence, or `<strong>title</strong>` plus text when it needs both; the icon comes from the class. Server flashes become toasts; saving never shows one.
- **Toasts are always closable**: every toast has an × button that removes it at once; errors stay until closed, successes fade after 5 s. Client messages use ui.js's `toast(text, ok)`, never an app's own toast code, so a toast can never sit over the page with no way to dismiss it.
- **Progress**: a task that takes time shows `<label class="progress"><span>what runs · 312 of 1.200</span><span class="pct">26 %</span><progress value max></progress></label>`; unknown length is `<progress>` without value. A short wait is the button spinner (`aria-busy`), not a bar.

## Charts

Server-rendered, minimal, from `chart.go` and CSS; no library. Pick the form by the job: a single number with trend is a stat tile (`Spark` plus a caption with its period: "Dec 2025 · 12 months · Nov"), ranked parts are `.bars` (one hue, largest first), one ratio is a `.meter`, a split is a `.stack`, a trend over time is `Columns` (past grey, current period in the accent with its value). Never a pie, never two y-axes. Every chart has a table view and a tooltip on hover and focus. More than one series: the categorical order blue `#2563eb`, pink `#db2777`, amber `#d97706`, green `#16a34a`, always with a legend or direct labels (two pairs are close for color-blind readers).

## Keyboard (vim style)

`g`+letter nav · `/` search · `Ctrl+K` or `:` palette · `?` help (only what works on this view) · `j`/`k` rows · `Enter` open · `h`/`l` tabs · `p`/`n` pages · `1`…`9` chips · `Esc` leave field, close, one breadcrumb up · `[data-key]` on any control. Page handlers: `window.pageKeys = {c: fn, 'C-Enter': fn, 'A-j': fn}` (return `false` to fall through). Handled keys never type into fields. Options of a form (checkboxes, radios, choices a user votes on) get no letter or digit keys: a stray key would pick one; `1`…`9` are for chips only. Shortcuts are letters, digits or keys that need at most Shift on a German/Austrian ISO layout (`/` `?` `:` included); never brackets, braces, backslash, `@` or anything else behind AltGr.

## Error pages

Every error page is the shared `nb-error`: `{{define "main"}}{{template "nb-error" .}}{{end}}` in `nb-layout` (signed in) or `nb-bare` (public: signed out, a link, the server starting). The app passes `.Error` (partials.html documents it): `Code`, and what applies: `What` (404, "customer CUS-9999"), `Need` and `Groups` (403), `Limit` (413), `Ref` (500, copyable), `Retry` seconds (429, 503: counts down and reloads), and `Actions` (the ways on, the first is primary, each with its icon and key). Titles and texts for 400 401 403 404 409 410 413 429 500 503 come from ui in English and German (keys `nberr.*`, so they never collide with an app's own `error.*`); an app adds none of its own. Each of these codes shows on a dot-matrix display (light panel in light, glowing in dark, dots in the primary color) above a line drawing of the nobloat mark ][◆ and what happens to it; other codes show the text only. `wireframe-errors.html` shows all ten with design, theme and primary color to switch. Never Go's plain `http.Error` page for a browser: a request that wants HTML gets `nb-error`.

## Calendar

`calendar.js` on `#cal` draws, moves and resizes entries and fires `cal:create {date, start, end}`, `cal:change {id, date, start, end, el}`, `cal:open {id, el}` (preventDefault to handle it), `cal:delete {id, el}`; the app saves and re-renders. Entries are links without JS. Phones show one day with swipe and arrows. `#cal[data-now]` is the server's minute of the day (its timezone, the same as `.hd.today`); `c` creates the entry there. Moves and nudges keep an entry's length inside its day.

## Before a page is done

- Started from an example page; no component restyled in `app.css` (not `body` either: the designs set its padding and win); no bare colors. App class names do not reuse ui's (`.results`, `.rows`, `.info`…). ui's section headings (`main h2`) are styled at element weight, so an app's own component can style its `h2`; `.card h2` is a flex row (spaces between its parts collapse: use a gap or separate elements).
- Checked desktop and phone, light and dark (`examples/preview.html` style, or the app at 390 px in DevTools).
- `node ../ui/check.mjs <app urls>` reports 0 problems. That only rules out layout and accessibility faults: also screenshot every page at desktop and phone width and look at it (alignment, wasted space, wrapping, crowding) before it counts as done.
- Works without JS (forms post, links filter); keyboard only works too.
- Every state of the page survives a reload and a copied link (deep links).
