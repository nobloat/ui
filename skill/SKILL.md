---
name: nobloat-ui
description: How every nobloat app looks and behaves: the shared nobloat/ui reference (ui.css, ui.js, calendar.js, chart.go, Go template partials, example pages) and its rules for layout, light/dark, mobile, accessibility (WCAG 2.2 AA), navigation, forms with autosave, actions and icons, money, dates, ids, tags, dashboards and charts, keyboard and command palette. Use when building, changing or reviewing any page, template, style or front-end behavior of a nobloat app, or when starting a new nobloat app's UI.
---

# nobloat-ui

The UI of nobloat apps comes from one reference repo, **nobloat/ui** (checked out next to the app as `../ui`; this skill is `../ui/skill/SKILL.md`). It is copied, never imported: no build step, no npm, no web fonts, no icon or chart library. Live gallery: https://nobloat.github.io/ui/ (and `examples/preview.html` for desktop and phone side by side).

Before writing a page, open the nearest example in `../ui/pages/` (gallery `index`, `dashboard`, `list`, `detail`, `form`, `dates`, `week`, `month`, `settings`, `status`, `login`) and copy its structure. Everything below is enforced by `node ../ui/check.mjs` where it can be checked by a machine.

## Setup in an app

1. Copy unchanged into the app: `ui.css`, `ui.js` → `web/static/`; `partials.html` → `web/`; `calendar.js` only for calendar pages; `chart.go` only for charts (change the package line, register `Spark`/`Columns` as template funcs). Merge `i18n/{en,de}.json` into the app's i18n files. Copy `favicon.svg` and replace the character and color.
2. A diff against `../ui` must stay empty. App styles go in `web/static/app.css` (via `{{define "head"}}`), app code in `app.js` (via `{{define "scripts"}}`). A change two apps need goes into nobloat/ui first, then into both apps.
3. Parse `partials.html` before the pages; every page is `{{template "nb-layout" .}}` + `{{define "main"}}` (public pages: `nb-bare`). The page value needs the fields listed at the top of `partials.html` (`Lang`, `Title`, `Here`, `Brand`, `Nav`, `Crumbs`, `Search`, `SearchAPI`, `User`, `UserURL`, `LogoutURL`, `SettingsURL`, `Texts`, `T(key)` …).
4. Add the check to the app's tests or CI: `node ../ui/check.mjs http://localhost:PORT/ /customers /customers/cus_0042 …` (every page type once, with realistic data). It must report 0 problems.

## Look and theming

- Monospace, thin rules, generous space, color only where it means something. Two designs, set on `<html data-design>`: none = **plain** (default), `nordic` (more air, softer tones). No others: fewer designs, each finished in light, dark and on phones.
- One knob per app: `--brand` (`Brand.Color`). Dark mode derives its own shade; `--brand-dark` overrides. `--brand` needs 4.5:1 on the light background, its dark shade on the dark one.
- Custom brand: `Brand.Logo` plus `Brand.LogoDark` (CSS shows the dark one whenever the page is dark, also when pinned), `Brand.Name` for title and label. The footer always credits `nobloat/<app>`.
- Colors only through tokens (`--fg --muted --line --chip --sel --accent --bg`) or `light-dark()`. A bare hex in `app.css` is a bug. Never `prefers-color-scheme` in CSS (ignores the pinned theme). State colors `--green --yellow --red --blue --grey` mean state and nothing else; as text use `color: var(--c-text)` with `--c` set.

## Light and dark

Both first-class. The page follows the OS; ◐ in the header (desktop) or the theme row on the settings page (`nb-prefs`) pins light or dark in `localStorage`, applied in `<head>` before first paint. Check every page in both.

## Mobile

Works at 320–500 px without sideways scrolling or zoom; the breakpoint is 40rem.
- Header: search on its own row, nav behind ☰ as a vertical list, language and theme only on the settings page.
- Tables become one card per row with "label … value" lines (labels from `<thead>`, set by ui.js; all columns shown, numbers right). A table that must stay a table gets `class="keep"`.
- Forms one column; overflow menus become a bottom sheet; toasts full width at the bottom.
- Create, edit, delete and copy buttons show only their icon; the text stays for screen readers.
- `kbd` hints disappear on touch: every shortcut also has a visible control.

## Accessibility (WCAG 2.2 AA, checked)

- Contrast: text 4.5:1 (3:1 from 24px or 18.66px bold), state graphics and field edges 3:1, placeholders 4.5:1. Muted text included.
- Every control has a name (visible label, `aria-label`, or `title`); every image `alt` (decorative `alt=""`); ids unique; one `main`, one `h1` per page; `lang` and a title.
- Targets at least 24×24 px or spaced; visible keyboard focus everywhere (`:focus-visible` outline, fields show it on their border); a skip link; dialogs are native `<dialog>`.
- Never color alone: a state is a dot or glyph with `role="img" aria-label`, plus a word nearby. Respect `prefers-reduced-motion`.

## Navigation

- Header (`nb-header`): logo, search, ⌘ palette button, ⚙ settings and ⏻ logout as icon links. Settings is never a nav item.
- Nav: the app's main object types, each with a `g`+letter key (`Nav[].Key`).
- Breadcrumbs (`Crumbs`) on every page below the top level: parent links, the current page last without link. `Esc` goes one up; phones show "← parent".
- Command palette on every page (built into ui.js): `Ctrl+K` / `⌘K` / `:`. It lists nav, header links, every visible `[data-key]` action of the page, theme and help; apps add commands with `window.commands = [{label, sub, run}]`; unknown input falls back to search.
- Search: `/` focuses it; with `SearchAPI` it searches live, grouped by type; an exact id opens the object.

## Deep links: the URL is the UI state

Everything a user can set up or open is in the URL, so reload, Back, a bookmark or a link sent to a colleague shows exactly the same view. Not in the URL: personal preferences (theme, language: settings), secrets, passing things (hover, focus).
- **Query (server renders it, works without JS):** search `q`, filters (`state`, `tag`, chips are links), sort (`sort`, `dir`), page, tab, period/range, calendar week and month, chart range. Every control that changes the view is a link or a GET form, never a JS-only toggle. Defaults are omitted (`?sort=name` only when it is not the default).
- **Prefill:** create forms take their fields from the query: `/customers?name=ACME&email=…#new` opens "New customer" filled in. The server renders the values; `form[data-prefill]` covers dialogs and static pages. Other apps and mails link this way instead of copying data.
- **Hash (ui.js keeps it in sync with `history.replaceState`, no extra history entries):** the open dialog (`#new`, closing removes it), the selected row (`#cus_0042`: rows carry their object id as `id`), the day shown on a phone in the week calendar (`#2026-11-05`), an anchor in a long page.
- **Sortable columns:** the header is a link (`<th aria-sort="ascending"><a href="?sort=name&dir=desc">name</a></th>`); one click sorts, a second reverses; the current column shows ↑/↓.
- Objects have one canonical URL with their id (`/customers/cus_0042`); a POST answers with a redirect to a URL that shows the result (no "resubmit?").

## Ids

Every object a user can find or open has an id with a type prefix: `cus_0042`, `inv_2026-0042`, `prj_website`, `usr_7f3a9c`, `key_9c1a`. Shown as `<code class="id">` with a copy button, used in URLs, search results, logs, mails. Legal or human numbers (invoice number 2026-0042) are separate fields.

## Page anatomy

- `.pagehead`: `h1` and the page's primary action. Lists: chips with counts and colored tags above, table, `.pager` (`p`/`n`) or filters, `.empty` with the create action when empty. Detail: crumbs, title with state, actions (primary visible, rest in `details.more`), tags, `.info` grid with copyable ids, tabs, history in `details.audit`.
- Dashboard (`dashboard` example): stat tiles first (`.tiles > a.tile`: label, value, delta, sparkline or meter; each tile links to its list), then "needs attention" (actionable rows with a button), then one or two charts, then recent activity. Only what the user acts on; no decoration.
- Settings (`⚙`): account from the sign-in (name, username, email, groups, role, IdP, session, user id, link to manage the account, logout), preferences (`nb-prefs`: language, theme), then app settings, users, keys.

## Actions and icons

- **Icons** come from the nobloat/ui set only (`icons/`, see the Icons example page): one class, `<i class="icon-cog" aria-hidden="true"></i>`, sized by the font, tinted by `color`. No other icon sets, no emoji, no Unicode glyphs as icons. New icons go into `icons/*.svg` in nobloat/ui (16×16, 1.5 stroke, round caps, currentColor) and `go test -update` there generates the CSS and the sprite.
- **Use an icon where it is faster to read than the word alone**: every action button (before the text), icon-only header and row buttons (with `aria-label`), menus, pagers and steppers (chevrons step, arrows go somewhere), links out (`icon-external` after the text), messages (`info`, `warning`, `error`, `ok`), state next to its word, units in `.affix`, empty states. Not on every chip, tab or label: an icon that does not help reading is noise. The same action has the same icon everywhere.
- Create, edit, delete and copy buttons always carry their icon: `class="new"`, `edit`, `del`, `copy` (on `button` or `.btn`); icon-only links `class="round ico cog"` etc. with `aria-label`. `.del` is red; every delete or public action has `data-confirm="…"` naming the object and the consequence.
- A primary action per page (`.pri`), at most one. Every submit shows a spinner (`aria-busy`, automatic).
- Shortcuts: `c` create, `e` edit, `Del` delete where it makes sense, shown as `<kbd>` in the button and in the keys line (`{{define "keys"}} · …{{end}}`).

## Bulk actions

Lists where users act on many objects get a checkbox column: `th.pick` with `input[data-all]`, `td.pick` with `input name="ids" value="cus_…" form="bulk"`, and `<form id="bulk" class="bulkbar" method="post">` with one button per action (`name="do" value="archive"`). ui.js hides the bar until something is selected, shows "{n} selected", `x` toggles the cursor row, `Esc` clears; destructive buttons carry `data-confirm-n="Archive {n} customers? …"`. Without JS the bar is always there and posts the checked ids.

## Forms

- **Edit forms autosave**: `form[data-autosave]`, every change is posted (JSON answer `{rev}` or 4xx `{error, field, hint}`). Saved state is quiet: the field edge flashes once and `.saved` says "✓ saved 14:02"; never a toast. The submit button is `.nojs` (the no-JS path). Concurrent edits use a `rev` field.
- **Create** cannot autosave (no object yet): a small form (dialog or page) with only the required fields and one `+ Create` button, then the user continues on the autosaving edit form.
- **Errors** sit right under the field in one short line: the field gets `aria-invalid`, and `<span class="err">what is wrong<span class="valid">what is valid, with an example</span></span>` reads "Not a valid VAT id: ATU and 8 digits, e.g. ATU12345678". No second line, no explanation beyond the valid form. The server renders the same markup without JS; ui.js shows the browser's own checks (`required`, `pattern` + `title`, `type`, `min`/`max`) the same way. Every pattern has a `title` that names a valid example.
- **Uploads**: a drop zone, `<label class="drop">` around `<input type="file" accept="…" data-max="bytes">` with an upload icon, "Drop … here or choose", and always the supported files and the size limit in `<small>`. ui.js highlights every zone while files are dragged over the window, says "release to add n files" over a zone, refuses what `accept`/`data-max` exclude with a field error, and lists the files with their sizes. A single file can be a button: `<label class="btn"><i class="icon-upload"></i> Upload logo <input type="file"></label>` with the supported files next to it. The server checks type and size again.
- Single choice: `.seg` radios or `select`; several values: `data-pick` with a `datalist`; one value with suggestions: native `list`.

## Errors and the session

- Error pages keep the app's header and nav (`nb-layout`) so the user can go on: the code small, the message as `h1` in plain words, what happened to their work, and buttons for what to do next (`pages/404.html`, `403.html`, `500.html`). Never a stack trace.
- 404 for objects that do not exist **and** for objects the user may not see (no hint that they exist); 403 only for pages or sections the role cannot use, naming the signed-in user, their groups and who can grant access.
- 500: say whether the last change was saved, and show a reference id (`err_…`, also in the log) with a copy button.
- Session: `SessionEnd` (and `SessionRenew`, a GET that extends it and answers `{end}`) on the page; ui.js shows a bar 5 minutes before the end ("Stay signed in") and after it ("sign in again to save", in a new tab). The page keeps all input; autosave answers 401 the same way instead of a field error.

## Data display

- **Money**: integer cents on the server, format configured by example (`1.234,56`, `{amount} {symbol}`). Always with the currency. `<data class="money" value="cents">`. No sign: neutral (prices, totals, balances). Explicit `+` green (`.pos`), explicit `−` red (`.neg`), a real minus sign. Inputs: `.affix` with the unit and `data-money="1.234,56"` (accepts both conventions, rewrites to the example, refuses the rest with a hint).
- **Dates**: native inputs only (`date`, `time step="900"`, `datetime-local`, `month`, `week`), ISO on the wire. Lists show ISO dates; recent events relative with the exact time in `title`; durations `h:mm`. Ranges: preset chips (links) plus a from–to form.
- **Tags**: `a.tag`; a user-chosen color is `style="--c:#…"` (tinted pill, text keeps full contrast), picked from `.swatches` (preset colors safe on light and dark, plus custom).
- **Status**: `.dot.ok/.pend/.bad/.run/.off` or `.st` glyphs, always labeled.
- **Messages**: `.flash` (error), `.flash.ok`, `.warn`, `.banner` (info); one sentence, or `<strong>title</strong>` plus text when it needs both; the icon comes from the class. Server flashes become toasts; saving never shows one.
- **Progress**: a task that takes time shows `<label class="progress">what runs · 312 of 1.200<progress value max></progress></label>`; unknown length is `<progress>` without value. A short wait is the button spinner (`aria-busy`), not a bar.

## Charts

Server-rendered, minimal, from `chart.go` and CSS; no library. Pick the form by the job: a single number with trend is a stat tile (`Spark`), ranked parts are `.bars` (one hue, largest first), one ratio is a `.meter`, a split is a `.stack`, a trend over time is `Columns` (past grey, current period in the accent with its value). Never a pie, never two y-axes. Every chart has a table view and a tooltip on hover and focus. More than one series: the categorical order blue `#2563eb`, pink `#db2777`, amber `#d97706`, green `#16a34a`, always with a legend or direct labels (two pairs are close for color-blind readers).

## Keyboard (vim style)

`g`+letter nav · `/` search · `Ctrl+K` or `:` palette · `?` help · `j`/`k` rows · `Enter` open · `h`/`l` tabs · `p`/`n` pages · `1`…`9` chips · `Esc` leave field, close, one breadcrumb up · `[data-key]` on any control. Page handlers: `window.pageKeys = {c: fn, 'C-Enter': fn, 'A-j': fn}` (return `false` to fall through). Handled keys never type into fields. Shortcuts are letters, digits or keys that need at most Shift on a German/Austrian ISO layout (`/` `?` `:` included); never brackets, braces, backslash, `@` or anything else behind AltGr.

## Calendar

`calendar.js` on `#cal` draws, moves and resizes entries and fires `cal:create {date, start, end}`, `cal:change {id, date, start, end, el}`, `cal:open {id, el}` (preventDefault to handle it), `cal:delete {id, el}`; the app saves and re-renders. Entries are links without JS. Phones show one day with swipe and arrows.

## Before a page is done

- Started from an example page; no component restyled in `app.css` (not `body` either: the designs set its padding and win); no bare colors.
- Checked desktop and phone, light and dark (`examples/preview.html` style, or the app at 390 px in DevTools).
- `node ../ui/check.mjs <app urls>` reports 0 problems.
- Works without JS (forms post, links filter); keyboard only works too.
- Every state of the page survives a reload and a copied link (deep links).
