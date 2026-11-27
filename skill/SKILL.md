---
name: nobloat-ui
description: How a nobloat app uses the shared nobloat/ui (ui.css, ui.js, calendar.js, chart.go, Go template partials, example pages): setup, the page value, and the markup, classes, data attributes and ui.js behaviour that carry each design rule (layout, light/dark, mobile, accessibility, navigation, deep links, forms with autosave, actions and icons, money, dates, ids, tags, dashboards and charts, keyboard and command palette). The rules themselves are in design-system.md. Use when building, changing or reviewing any page, template, style or front-end behavior of a nobloat app, or when starting a new nobloat app's UI.
---

# nobloat-ui

The UI of nobloat apps comes from one reference repo, **nobloat/ui** (checked out next to the app as `../ui`; this skill is `../ui/skill/SKILL.md`). It is copied, never imported: no build step, no npm, no web fonts, no icon or chart library.

**The rules are in [`design-system.md`](design-system.md), the only source.** Read it first. This file says which markup and API carry each rule in an app today; it never restates a rule. Where today's `ui.css` does not follow a rule yet, `design-system.md` → To do → Rollout lists it; until it ships, the markup below is what works.

Before writing a page, open the nearest example in `../ui/pages/` (`dashboard`, `list`, `detail`, `form`, `dates`, `week`, `month`, `settings`, `status`, `login`) and copy its structure. `node ../ui/check.mjs` enforces what a machine can check.

## Setup in an app

1. Copy unchanged into the app: `ui.css`, `ui.js` → `web/static/`; `partials.html` → `web/`; `calendar.js` only for calendar pages; `chart.go` only for charts (change the package line, register `Spark`/`Columns` as template funcs). Merge `i18n/{en,de}.json` into the app's i18n files. App icons and manifest: `../ui/appicon.sh` (Rules: Pages and content → Installable).
2. A diff against `../ui` must stay empty. App styles go in `web/static/app.css` (via `{{define "head"}}`), app code in `app.js` (via `{{define "scripts"}}`). A change two apps need goes into nobloat/ui first, then into both apps.
3. Parse `partials.html` before the pages; every page is `{{template "nb-layout" .}}` + `{{define "main"}}` (public pages: `nb-bare`). The page value needs the fields listed at the top of `partials.html` (`Lang`, `Title`, `Here`, `Brand`, `Nav`, `Crumbs`, `Search`, `SearchAPI`, `User`, `UserURL`, `LogoutURL`, `SettingsURL`, `Texts`, `T(key)` …).
4. Add the check to the app's tests or CI: `node ../ui/check.mjs http://localhost:PORT/ /customers /customers/CUS-0042 …` (every page type once, with realistic data). It must report 0 problems.

## Brand and theme

Rules: Foundations and look (Brand, Theme switch).
- `Brand.Color` sets `--brand`, `Brand.ColorDark` `--brand-dark`. `Brand.Logo` plus `Brand.LogoDark` (shown whenever the page is dark), `Brand.Name` for title and label. `Brand.Design` picks today's design (Rollout: one design).
- Colours in `app.css` only through today's tokens (`--fg --muted --line --chip --sel --accent --bg`, states `--green --yellow --red --blue --grey`; as text `color: var(--c-text)` with `--c` set) or `light-dark()`. Never `prefers-color-scheme` in CSS (it ignores the pinned theme).
- The theme row in the user menu or `nb-prefs` on the settings page pins light or dark in `localStorage`, applied in `<head>` before first paint.

## Phones

Rules: Widths.
- Tables become cards with labels from `<thead>` (set by ui.js); a table that must stay a table gets `class="keep"`.
- The page's primary action is `.pri`; a page form's Cancel is `class="cancel"` (a link to where the user came from) and is hidden on phones.

## Accessibility

Rules: Accessibility. ui.js and the partials supply the skip link, the focus outline and native `<dialog>`; state graphics carry `role="img" aria-label`. Links to other sites need `target="_blank" rel="noopener"` (that also adds the external icon).

## Navigation

Rules: Pages and content (Header, Nav, Breadcrumbs, Command palette).
- Header (`nb-header`) and user menu come from the partials. Sign out is the POST form to `LogoutURL` (auth accepts it from the apps' origins); a logout on the settings page is the same form.
- `Nav[]` (`Href`, `Label`, `Key`, `On`). An app whose own sidebar already navigates (jot) leaves `Nav` empty; its sidebar gets `id="nav"` and its links `data-g`.
- `Crumbs`: parent links, the current page last.
- Palette: built into ui.js. An app without one (call) sets `<body data-nopalette>` (`{{define "bodyattr"}} data-nopalette{{end}}`). It lists nav, header links, every visible `[data-key]` action, theme and help; apps add commands with `window.commands = [{label, sub, run}]`; unknown input falls back to search. With `SearchAPI` search is live, grouped by type; an exact id opens the object.

## Deep links

Rules: Pages and content (Deep links).
- Filters as links or GET forms; sortable columns `<th aria-sort="ascending"><a href="?sort=name&dir=desc">name</a></th>`.
- Prefill: the server renders query values into create forms; `form[data-prefill="name email"]` fills only the listed fields in dialogs and static pages (a bare `data-prefill` only free-text fields, never selects, checkboxes, radios or pills). Never list roles, groups or permissions.
- Hash, kept in sync by ui.js with `history.replaceState`: the open dialog (`#new`), the selected row (rows carry their object id as `id`), the day on a phone in the week calendar (`#2026-11-05`).

## Ids

Rules: Pages and content (Ids). Markup: `<code class="id">CUS-0042</code>` with a copy button.

## Page anatomy

Rules: Pages and content (Page head, List, Detail, Dashboard, Settings). Markup: `.pagehead` (`h1` and actions), chips, `.pager`, `.empty` with the create action, `details.more` for further actions, `.info` grid, tabs, `details.audit` for history; dashboard `.tiles > a.tile`; settings `nb-prefs`.

## Actions and icons

Rules: Icons and buttons (which icon, every button has one, one primary, delete confirms, key hints).
- Icons: `<i class="icon-cog" aria-hidden="true"></i>`, sized by the font, tinted by `color`; `off` crosses one out (`icon-user off`). A missing icon is added to nobloat/ui first (README: Adding an icon).
- `check.mjs` fails a visible `button` or `.btn` without an `<i class="icon-…">` or a class that draws one: `new`, `edit`, `del`, `copy`, `ico`.
- `class="new"` creates an object; adding a row or value inside a form is a plain button with `<i class="icon-plus">` and its text. `.del` is red. Every delete or public action has `data-confirm="…"` naming the object and the consequence, optionally `data-confirm-title="Delete ACME GmbH?"`. Dialogs have an `h2` title (`aria-labelledby`).
- `.pri` is the one primary action. Every submit shows a spinner (`aria-busy`, automatic); ui.js drops a second submit of the same form within 3 s and a held `[data-key]` clicks once. Mutations that must not happen twice still need an idempotency check on the server.
- `data-key="c"` is the one source of a shortcut; ui.js adds the `<kbd>` where the markup has none; an icon-only button names it in `title="Mute (m)"`.
- `?` help: each row can carry `data-needs="<selector>"`; ui.js hides it when nothing visible matches. A page's own rows come from `{{define "help"}}` with their own `data-needs`; an empty section disappears.

## Keyboard

Rules: Icons and buttons (Keys). Page handlers: `window.pageKeys = {c: fn, 'C-Enter': fn, 'A-j': fn}` (return `false` to fall through). Today's ui.js also has `g`+letter nav, `/` search, `:` palette, `h`/`l` tabs, `p`/`n` pages and `1`…`9` chips (Rollout).

## Bulk actions

Rules: Pages and content (List). Markup: `th.pick` with `input[data-all]`, `td.pick` with `input name="ids" value="CUS-…" form="bulk"`, and `<form id="bulk" class="bulkbar" method="post">` with one button per action (`name="do" value="archive"`). ui.js hides the bar until something is selected and shows "{n} selected"; `x` toggles the cursor row, `Esc` clears; destructive buttons carry `data-confirm-n="Archive {n} customers? …"`. Without JS the bar is always there and posts the checked ids.

## Forms

Rules: Pages and content (Forms).
- Autosave: `form[data-autosave]`; every change is posted (JSON answer `{rev}` or 4xx `{error, field, hint}`); `.saved` shows the time; the submit button is `.nojs`. Concurrent edits use a `rev` field; ui.js sends one save per form at a time, nothing while a field is invalid, and offers a reload on `409`.
- Field errors: `aria-invalid` on the field and `<span class="err">what is wrong<span class="valid">what is valid, with an example</span></span>`; the server renders the same without JS; ui.js shows the browser's own checks (`required`, `pattern` + `title`, `type`, `min`/`max`) the same way. Every pattern has a `title` naming a valid example.
- Uploads: `<label class="drop">` around `<input type="file" accept="…" data-max="bytes">` with the supported files and the size limit in `<small>`; ui.js highlights zones while dragging and refuses what `accept`/`data-max` exclude. A single file: `<label class="btn"><i class="icon-upload"></i> Upload logo <input type="file"></label>`. The server checks type and size again; inside `data-autosave` the file is posted as multipart, so the server accepts `multipart/form-data` there.
- Choices: `.seg` radios or `select`; several values `data-pick` with a `datalist` (pills with ×; a space-separated text field without JS); one value with suggestions: native `list`.

## Errors and the session

Rules: Pages and content (Errors, Session).
- Every error page is `nb-error`: `{{define "main"}}{{template "nb-error" .}}{{end}}` in `nb-layout` (signed in) or `nb-bare` (public). The app passes `.Error` (documented in `partials.html`): `Code`, and what applies: `What` (404), `Need` and `Groups` (403), `Limit` (413), `Ref` (500), `Retry` seconds (429, 503: counts down and reloads), `Actions` (the first is primary, each with icon and key). Texts for 400 401 403 404 409 410 413 429 500 503 come from ui (`nberr.*`); an app adds none. A request that wants HTML never gets Go's plain `http.Error`.
- Session today: `SessionEnd` and `SessionRenew` (a GET that extends it and answers `{end}`); autosave answers 401 like an expired session (Rollout: no session bar).

## Data display

Rules: Pages and content (Money, Tags, Messages, Progress), Foundations and look (Dates and times, Waiting).
- Money: integer cents on the server, the format configured by example (`1.234,56`, `{amount} {symbol}`); `<data class="money" value="cents">`, `.pos` and `.neg` for explicit signs. Inputs: `.affix` with the unit and `data-money="1.234,56"` (accepts both conventions, rewrites to the example; a single separator with three digits follows the example: with `1.234,56`, `1.500` is 1500 and `0,125` is refused).
- Dates: text fields with a pattern and a sample placeholder; the picker button is from ui.js; recent events show the exact time in `title`.
- Tags: `a.tag` with `style="--c:#…"`, picked from `.swatches` (plus a `value="custom"` radio and `input[type=color] name="custom"`; the server takes `custom` when that radio is checked).
- Row list: `ul.rows` > `<li id="PRJ-WEBSITE" data-href="…">` with `.dot`, `a.main`, `.meta`, `.num`, row buttons.
- Status: `.dot.ok/.pend/.bad/.run/.off` or `.st` glyphs, always labelled.
- Messages: `.flash` (error), `.flash.ok`, `.warn`, `.banner` (info); server flashes become toasts. Client toasts only through ui.js's `toast(text, ok)`.
- Progress: `<label class="progress"><span>what runs · 312 of 1.200</span><span class="pct">26 %</span><progress value max></progress></label>`; a short wait is the button spinner (`aria-busy`).

## Charts

Rules: Pages and content (Charts), Tokens and colour (series colours). `chart.go`: `Spark` for stat tiles, `Columns` for a trend; CSS `.bars`, `.meter`, `.stack`.

## Calendar

`calendar.js` on `#cal` draws, moves and resizes entries and fires `cal:create {date, start, end}`, `cal:change {id, date, start, end, el}`, `cal:open {id, el}` (preventDefault to handle it), `cal:delete {id, el}`; the app saves and re-renders. Entries are links without JS. Phones show one day with swipe and arrows. `#cal[data-now]` is the server's minute of the day (its timezone, the same as `.hd.today`); `c` creates the entry there. Moves and nudges keep an entry's length inside its day.

## Before a page is done

- Started from an example page; follows the rules in `design-system.md` (apps: Layers → One shell).
- ui's section headings (`main h2`) are styled at element weight, so an app's own component can style its `h2`; `.card h2` is a flex row (use a gap or separate elements).
- `node ../ui/check.mjs <app urls>` reports 0 problems; then screenshot every page at desktop and phone width, light and dark, and look at it.
- Works without JS and with the keyboard only; every state survives a reload and a copied link.
