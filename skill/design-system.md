# nobloat design system

Rules for any agent working on the nobloat design system. Read all of it before starting. These rules come from mistakes that were made; each one is an order from the owner, not a suggestion.

## Goal, working surface and source of truth

A reusable, sustainable design system to design new nobloat apps quickly, UI and UX.

- **Working surface:** `foundations.html` and `components.html` in the repo root, plain HTML (open in a browser, nothing to build). Tokens in `token.css`, components in `components.css` (layer 1), `composed.css` (2), `shell.css` (3) and `components.js`, the page frame in `showcase.css` and `showcase.js`. Each foundation and each group of components is a section, linked from the sticky bar; the two pages link to each other at the top.
- **One source for the rules: this file.** Every design and UX rule lives here and nowhere else. The others only show or use them: `foundations.html`, `components.html`, `shell.html` and `documents.html` show specimens, `index.html` gives the overview (philosophy, principles, architecture), `skill/SKILL.md` tells an app which markup and API carry a rule and links here, `README.md` covers setup. Never restate a rule elsewhere; link to its section. Where today's `ui.css` does not follow a rule yet, that is an item under To do → Rollout, not a second rule.
- When the components are complete, `ui.css` is streamlined once to match (old token names as temporary aliases, then every app via `make ui`) and the old gallery (`pages/`, `examples/`, `screenshots/`) goes.
- `ui.css`, `ui.js`, `partials.html` and `skill/SKILL.md` are not changed as part of design system work unless the owner asks.

### Keeping it in sync

Every change touches all of its places in one commit. The check in the last column fails when one is missed; a row without a check depends on you.

| Change | Also | Check |
|---|---|---|
| New icon | `icons/<name>.svg` (README: Adding an icon), `go test -update` (sprite, `icons.css`, `ui.css`), the grid in `foundations.html`; a row in the icon map below if it means an action or place | `TestIcons` (style, generated files) |
| New or changed token | `token.css`, its section in `foundations.html` (name and value once), light and dark | `TestTokensDefined` |
| New component | its layer's file only (table under Layers), built from tokens and lower layers; a specimen with its HTML on `components.html` (`shell.html` for the shell); the layer list in `index.html` if it adds a kind | `TestTokensOnly` (no raw length, duration, opacity or colour), `check.mjs` |
| New or changed rule | this file only; specimens that show it; SKILL.md only if the markup or API changes; a Rollout item if `ui.css` does not follow it yet | – |
| New page type, layer or file | `index.html` (architecture, layer graph, links) | `check.mjs` loads `index.html` |
| Anything on the design system pages | light and dark, 320 px to desktop | `check.mjs` (layout, contrast, names, icons on buttons) |

Run `go test ./...` and `node check.mjs` before reporting.

### Page rules for foundations.html

- Plain HTML and CSS, no Go templating, no build.
- Each value is shown once with its name and copyable values (hex and `oklch` for colours, the CSS line for type); derived values show where they come from (a scale or a dashed arrow), never a second copy.
- Foundations only: no app content (no invoices, customers, users), no components (dots, pills, buttons belong to components). Sample text says what nobloat stands for, not lorem ipsum.
- The page uses its own tokens (colours, type roles) for itself, so it proves they are consistent.
- One line per item, `line` for every border and divider, calm and spacious; look at a screenshot in light and dark before showing anything.

### Foundations and look

Shown in `foundations.html`; where today's `ui.css` still differs, see To do → Rollout.

- **One design** (graphite). Paper is removed.
- **Neutrals** from three sources per mode: `background`, `surface`, `text`. Two derived, mixed in OKLab (keeps greys grey): `line` (`text` 10 % on `background`: dividers, borders, chip fill, hover, inactive and decorative) and `muted` (67 %: secondary text, field edges).
- **Brand:** an app sets one colour, `brand`, and optionally `brand-dark` for dark mode (default: `brand`). `accent` is the brand adapted only where contrast would fail (OKLCH lightness at most .52 in light, at least .72 in dark). `selected` = `accent` 7 % on `background` (OKLab). `text-on-accent` is white in light and `background` in dark.
- **States**, named by meaning only, never by hue: `ok` #5f8a2e, `warn` #c2620a, `danger` #dc2626, `info` #3b82f6, `disabled` #7c7c85; one colour for both modes, for dots, icons and edges (3:1). The word next to a state stays in `text`. `danger` is also the fill of dangerous buttons with `text-on-danger` (white, 4.8:1). There is no `error`.
- **Names are descriptive:** `background`, `text`, `selected`, `text-on-accent`, not `bg`, `fg`, `sel`, `on-accent`.
- **Typography:** one family for the interface, the system monospace; five roles: `title` 600 32/1.2, `heading` 600 24/1.2, `subheading` 600 18/1.3, `body` 400 14/1.6, `small` 400 12/1.6 in `muted`. Emphasis is weight 600, never another size. `prose` for running text blocks: 400 17/1.65 `ui-serif, serif`, justified and hyphenated. A hero (big intro) and numbers are components, not type roles.
- **Wrapping:** running text `hyphens: auto` and `text-wrap: pretty`, at most `measure` (90ch of its own font) per line (longer text in columns); headings `text-wrap: balance`; buttons, labels and code never hyphenated; long strings `overflow-wrap: anywhere`; values joined with a non-breaking space (`1.234,56&nbsp;€`).
- **Spacing:** four steps, `space-4`, `space-8`, `space-16`, `space-32` (each double the last).
- **Sizes:** three: `size-icon` 16 (in an icon-only button `size-icon` + `space-4`), `size-control-small` 24 (small controls, chips, the smallest target), `size-control` 40.
- **Radius and borders:** `radius-control` 6 px, `radius-panel` 12 px, `radius-round`; `border` 1 px `line`, `border-field` 1 px `muted` (3:1), `focus` 2 px `accent` with 2 px offset.
- **Mixes:** two: `mix-tint` 8 % (hover, tinted fill) and `mix-edge` 30 % (pressed, tinted border, visited link); disabled controls `opacity-disabled` .45.
- **Elevation:** flat by default (panels and cards: a border, no shadow); three levels, each a shadow and a z-index: `raised` 10 (sticky bar, dragged row), `floating` 20 (message, menu, tooltip), `modal` 30 (dialog).
- **Links:** two kinds. Internal: `accent`, underline `stroke-thin` (`stroke-thick` on hover), offset `underline-offset`, visited dimmer. External (`target="_blank" rel="noopener"`): the same plus the `external` icon after it, at text size. Nothing else opens a new tab. Underline only on hover where the place says it is a link (tabs, table heads, row titles, breadcrumbs).
- **Breadcrumbs:** parents as `muted` links with their object icon, `chevron-right` between, the current page last in `text` without link (`aria-current="page"`); a narrow container shows only "← parent".
- **Theme switch:** auto (follows the system), light, dark; a segmented control with icon and word (`contrast`, `sun`, `moon`) where there is room, one icon-only button that cycles where not; switching is CSS alone (radios `name=theme` + `:has()`); the server renders the saved choice as the checked radio; JS only remembers it where no server does.
- **Navigation motion:** a page load cross-fades the content (`@view-transition { navigation: auto; }`, `duration-fast`, `ease`); the page header stays (`view-transition-name`); off with reduced motion; no script.
- **Modern CSS only:** custom properties, `:has()`, container queries, `light-dark()`, `color-mix()`, nesting, view transitions, logical properties; no preprocessor, no framework, no vendor-prefix workarounds, no JavaScript for what CSS can do.
- **Quote:** `figure.quote` > `blockquote` + `figcaption` (who, `cite` for the work); prose face in italic, a `stroke-thick` `line` on the left, the source small and muted.
- **Buttons:** default, primary, danger; icon-only and toggle as shapes. No quiet and no small type: a button inside another component (picker, id, message) takes a frameless 24 px look from that component.
- **Documents and print:** every document prints fully readable on a cheap black-and-white printer with as little ink as possible: black text on white, no colour, no filled or shaded areas, thin lines only, no grey lighter than `text` mixed with `mix-edge`; the screen preview shows exactly what prints.
- **Dates and times:** see Ground rules → Dates and times.
- **Waiting:** an unknown length (spinner) only for operations under 3 s; everything longer shows what runs and how far (count and percent), updated as it runs.
- **Headings never ALL UPPERCASE.**
- Look: 40 px controls, every button with `radius-control`, icon-only buttons square as well, 12 px panels.

## Layers: each one only from the one below

| # | Layer | Where | Built only from |
|---|---|---|---|
| 0 | Foundations: colours, typography, spacing, radius and borders, sizes, icons, elevation, motion | `token.css` | – |
| 1 | Components: button, forms (incl. one-time code), labels (incl. avatar), feedback, data, navigation and upload | `components.css` | tokens |
| 2 | Composed parts: dialog, menu and bottom sheet, card, stat tile, bulk bar, command palette, board, calendar (week, month) | `composed.css` | components |
| 3 | Shell: app header (logo, commands, user menu), nav, page head, footer, phone layout, and the page templates it frames (list, detail, form, dashboard, settings; login and errors are the shell without nav and user menu) | `shell.css`, `shell.html`; templates in `partials.html` | composed parts |
| – | Documents: invoice, letter, report, help page (print) | `documents.css` | foundations |

- **One shell** for every app; no second frame. Apps are outside `ui/` and fill the templates. An app never restyles a ui component (not `body` either), never reuses a ui class name for its own parts, and its own CSS uses tokens only.

- **Only tokens.** A component uses tokens and other components, never a raw colour, size or font. A tint only one component needs is a formula inside it, not a token.
- **Containers have content slots.** Card, dialog, panel and rows take any content; their own styling never depends on what is inside.
- **One step at a time.** Every new part goes through the iteration process (Working with the owner) before it enters a layer.
- **A part enters the system when two apps need it;** otherwise it stays in the app.
- **Change once, everywhere.** A token or component change reaches every page that uses it.

## Ground rules (hard)

### Tokens and colour

- **Light and dark** are first class and come from the same tokens (`light-dark()`), never from component variants.
- No component tokens; components use the semantic tokens above. A tint that only one component uses (a pill's background) is a formula inside that component, not a token.
- Colour only means something: brand for interaction and selection, states for state, signed money in `ok` and `danger`. Never colour alone: a state is a dot or glyph plus a word.
- Chart series beyond one: blue `#2563eb`, pink `#db2777`, amber `#d97706`, green `#16a34a`, in that order, always with a legend or direct labels.
- No fonts or icons from outside: system fonts only.

### Accessibility (WCAG 2.2 AA, in light and dark)

- Contrast: text and placeholders 4.5:1 (3:1 from 24 px, or 18.66 px bold), icons, field edges and state dots 3:1, muted text included. Exception: inactive or purely decorative elements (e.g. jot's faded boxes) use `line` and are exempt (WCAG 1.4.3, 1.4.11); `line` never carries meaning, text that must be read, or an active control's edge.
- Targets at least 24×24 px or spaced. Visible keyboard focus on every control (fields show it on their border), shown once for all controls.
- Every icon-only control has a name: `aria-label` and the same text as `title`, the browser's own tooltip; no tooltip component.
- Every control has a name, every image `alt` (decorative `alt=""`), ids are unique, one `main` and one `h1` per page, `lang` and a title; a skip link; dialogs are native `<dialog>`; motion respects reduced motion.
- Every page works with the keyboard alone and without JavaScript (forms post, filters are links).

### Widths

- Frames: phone 390, desktop 1280. A phone design must also work from 320 to 500 px without sideways scrolling; the breakpoint is 640 px (40rem).
- A variant only where the structure changes; everything else is the same component.
- Phone structure: header with logo, the Commands icon and the user menu; no ☰ (the nav stays a bar under the header, scrolling sideways; every place is also in the palette). Tables become one card per row with "label … value" lines (unless the table must stay a table); short lists of objects are row lists, not tables. Forms one column. Overflow menus become a bottom sheet; toasts span the width at the bottom. Create, edit, delete and copy buttons show only their icon; the primary action keeps its text and spans the width. A page form's Cancel is hidden ("← parent" does it). A dialog has no Cancel button: Esc, the backdrop and × cancel, Enter takes its one action (focused on open). No key hints.

### Variants and states

- **Few variants:** only what a designer picks in a mockup. Hover, focus, pressed, disabled and busy are shown once per component, not as variants.

### Icons and buttons

- Icons come only from `icons/` (16×16 grid, stroke 1.25, square ends, sharp joins, current colour), never drawn by hand; no emoji, no Unicode glyphs as icons. A missing icon is added to `icons/` first (`README.md`: Adding an icon). A chip that names data (a company, a year, a person) carries its kind's icon.
- **Every button has an icon, before the text, no exceptions** (actions, OK and Cancel, Close, tabs, pager, chips, menu items, icon-only buttons). Links out carry `external` after the text; messages, states, units and empty states carry theirs. Plain links in text and form labels get none.
- The same action has the same icon everywhere. Actions: confirm/save/OK `check` · cancel/close `x` · back `arrow-left` · next `arrow-right` · new `plus` · delete `trash` · archive `archive` · edit `edit` · copy `copy` · undo/reset `undo` · retry/reload `refresh` · random name or id `dice` · upload `upload` · download/export `download` · send `send` · comment `chat` · preview `eye` · print `print` · merge `merge` · sign in `log-in` · sign out `power` · lock/unlock `lock`/`unlock` · filter `filter` · search `search` · commands `terminal` · help `help` · more `more`. Places: dashboard `dashboard` · list `list` · board `columns` · calendar `calendar` · time `clock` · person `user` · people `users` · nobody `user` `off` · company `building` · project `folder` · tag `tag` · settings `cog` · keys `key` · money `euro` · document `file` · source `code` · language `globe` · reports `chart` · mail `mail` · home `home` · link `link` · photo `photo` · video `video` · live photo `live-photo` · logs `logs` · audit `audit` · shell `window` · support `support`. Chip states: all `list` · active/done `ok` · waiting `pause` · overdue/failed `warning` · archived `archive`.
- One primary button per page at most. Delete is red and always confirms, naming the object and the consequence. Dialogs always have a title.
- **Key hints on desktop**: a button with a shortcut shows it as a `kbd` after its text; an icon-only button names it in its tooltip (`Mute (m)`). Nav links show no keys (places are in the palette); Settings is `Ctrl ,`. Tabs, pager, chips and labels show none. Menu rows show their key; palette rows do not (typing goes into the search).
- **Keys**: `c` create, `e` edit, `Del` delete, `j`/`k` rows, `Enter` open, `Esc` leaves a field, closes, or goes one breadcrumb up, `?` help, `Ctrl K` palette, `Ctrl ,` settings. Every shortcut also has a visible control. `?` lists only what works on this view. Handled keys never type into fields. Options of a form (checkboxes, radios, choices a user votes on) get no letter or digit keys. Shortcuts need at most Shift on a German/Austrian ISO layout: never brackets, braces, backslash, `@` or anything behind AltGr. Phones show no key hints.

### Dates and times

- **Shown** to the user always as `dd.mm.yyyy` and `hh:mm:ss` in 24 h (`27.11.2026 14:05:00`), in lists, details and forms alike, in the user's time zone. Never the US order, never AM/PM, never ISO on screen. Recent events may read relative ("2 h ago") with the exact date and time in `title`. Durations `h:mm`.
- **Entered**: every date or time field is a text field the user can always type into by hand, `dd.mm.yyyy` and `hh:mm:ss` (24 h), with a pattern, a sample as placeholder and the usual one-line error naming the valid form. A picker button beside it opens the browser's own picker (`components.js`) and writes the choice back in the same form. The picker is a help, never the only way in.
- **Sent** to the server always as RFC 3339 **with the time zone offset**, never without: `2026-11-27T14:05:00+01:00`. The offset is the user's zone (the browser's) at that date, so summer time is right. A value without an offset is refused by the server, not guessed. The page converts on submit; the text field the user sees keeps the local form.
- **Stored and passed between apps** as RFC 3339 with the offset; the server renders it back in the user's zone.


- **Header**: logo left; right the Commands button (`terminal`, `Ctrl K`; opens the palette, searching is one of its commands; icon only on phones) and the user menu (the avatar: who, theme, language, the app's rows (shortcuts are in the footer), then Settings and Sign out after a line, fixed in every app). Apps that work offline add their sync state before Commands, a status: synced (with the time in its title), syncing n of m with percent and a progress bar, offline · n waiting, sync failed; on phones only the dot. Sign out is a POST form, never a GET link. Nothing else loose in the header. Settings is never a nav item. Apps without a palette (call) show no Commands button.
- **Footer**: at the end of every page with a signed-in user, small and muted under a hairline. Left the product `][◆ nobloat/<app>` (links to nobloat.org) and its version (links to its changelog entry); right `?` shortcuts (desktop only), support (`support` icon; a new issue with page, version and browser filled in) and source. Nothing else.
- **Changelog**: every app has one, every version an entry with its date, written for users in plain words: what you can do now, what works differently, what was fixed as you saw it. No technical detail: no refactors, dependencies, commit hashes or internal names.
- **Autosave**: everything a user edits is saved as they go (on change, text after a pause); there is no Save button. Buttons create, send or delete, never save. A failed save shows at the field and keeps the input.
- **Avatar**: a person is a round picture, or the initial where there is none, always with the name beside it or in its label; 40 px, small (24 px) in rows.
- **One-time code**: one field (paste and autofill work), `inputmode="numeric"`, `autocomplete="one-time-code"`, six slots drawn under the digits; never six inputs.
- **Board**: one column per state, cards in rank order; columns on the background, cards on the surface; a new button in each column head; dragging lifts the card and outlines the target column; narrow screens scroll the columns sideways.
- **Calendar**: week (hours down, days across, entries as boxes in their colour, a line at now, opens at the working day) and month (each day a link with its total and a bar of colours); phones show one day. `calendar.js` moves and reports, the app saves; without it every entry is a link.
- **Sign in**: the shell without nav and user menu: one column on the background, logo, title, fields, the primary spanning the width, then the way back and language. Each step (password, one-time code) is its own page.
- **Settings page**: one section per topic (topic and one line left, fields right, stacked on phones), no save button (autosave), a dangerous section last.
- **Dashboard**: stat tiles first, then cards with what needs doing; both in as many columns as fit.
- **Nav**: the app's places as a tab bar inside the header under its row: icon, name, a badge for what waits; no keys (every place is in the palette); the current place underlined in the accent. On phones it scrolls sideways; every place is also in the palette. Settings is never a nav item.
- **Installable**: every app is a PWA: `manifest.webmanifest`, `app-icon.svg`, `app-icon-192.png`, `app-icon-512.png` (also maskable) and `app-icon.png` (180, Apple) in its `web/static/`, written by `ui/appicon.sh` from the app's char and colour and committed; `partials.html` links them. No service worker for installing; apps that work offline bring their own.
- **App icon**: the mark in white on a full square in the brand colour (the platform rounds or masks it), the mark inside the middle 60 %. Favicon: the mark alone (`favicon.svg`). Logo: mark and app name. One source: the mark; never drawn separately.
- **Title tag**: `{page} · {app}`, most specific first (tabs cut from the right; the favicon names the app): `Invoices · bill`, `INV-2026-0042 · bill`, `New invoice · bill`, `404 · Not found · bill`, `Sign in · bill`. The page part is the h1 without its state; a custom brand puts `Brand.Name` for the app. A count first, `(3) Invoices · bill`, only for what waits.
- **Breadcrumbs** on every page below the top level, current page last without a link; phones show "← parent".
- **Page head**: title and the page's actions right of it (under it on phones). Actions never sit alone at the bottom; only a form's submit sits at its end.
- **List**: chips with counts and tags above, table or row list, pager, empty state with the create action. Sortable column headers are links and show ↑/↓. A table when people compare values across columns; a row list for short lists of objects with a few facts. Bulk lists: checkbox column and a bulk bar ("{n} selected"); a destructive bulk action confirms with the count.
- **Detail**: crumbs, title with state, actions (primary visible; a "more" menu only from three further actions on), tags, info grid with copyable ids (one or two facts are a muted line instead), tabs, history.
- **Dashboard**: stat tiles only for numbers that lead to an action (label, value, delta, sparkline or meter, each linking to its list), then "needs attention", then one or two charts, then recent activity. No decoration.
- **Settings**: account, preferences (language, theme), app settings, users, keys.
- **Forms**: edit forms autosave; saved shows quietly as "✓ saved 14:02" beside the form, never a toast. Create is a small form with only the required fields and one Create button. An error is one line under the field: what is wrong, then what is valid with an example. Uploads are a drop zone naming the supported files and the size limit. Single choice: segmented or select; several values: pills with ×.
- **Errors**: keep header and nav; small code, the message as title in plain words, what happened to the user's work, buttons for what to do next. 500 says whether the last change was saved and shows a copyable `ERR-…` reference. Never a stack trace, never a server's plain error page. 404 for objects that do not exist **and** for objects the user may not see; 403 only for pages the role cannot use, naming the user, their groups and who can grant access. The codes 400 401 403 404 409 410 413 429 500 503 show a dot-matrix display of the code in the brand colour above a line drawing of the mark ][◆.
- **Session**: no session bar; sessions slide, forms autosave, and an expired session sends the user to sign in and back to the same page.
- **Ids** look like ticket keys: a type key of 3 uppercase letters, a hyphen, the number or slug in uppercase (`CUS-0042`, `INV-2026-0042`, `ERR-7F3A9C12`); each type key means one thing across all apps; shown as code with a copy button, used in URLs, search, logs and mails; search matches them case-insensitively. Legal or human numbers (invoice number 2026-0042) are separate fields.
- **Deep links: the URL is the UI state.** Everything a user can set up or open is in the URL, so reload, Back, a bookmark or a sent link shows the same view; not in it: preferences, secrets, passing states (hover, focus). Search, filters, sort, page, tab, period are query parameters the server renders (defaults omitted); every control that changes the view is a link or a GET form. Create forms take their fields from the query (other apps and mails link instead of copying data); a link never chooses roles, groups or permissions. The open dialog, the selected row and an anchor are the hash. Objects have one canonical URL with their id; a POST answers with a redirect.
- **Money** always with the currency, a real minus sign; inputs with the unit as an affix.
- **Tags** are tinted pills in a user-chosen colour from preset swatches safe on light and dark; the text keeps full contrast.
- **Dialog**: for one decision or one or two fields, anything longer is a page. A title that asks or names the task, × top right, one action at the end; no Cancel button: Esc, the backdrop and × cancel, Enter takes the action (it has the focus on open). On a phone it comes up from the bottom.
- **Menu**: actions that do not fit beside the title, from the third on, behind "More" (popover, no script). Rows: icon, name, key; a dangerous row last after a line, its icon in `danger`. On a phone a bottom sheet without keys.
- **Command palette**: Ctrl K (or the header's Commands button) on every page; a centred dialog (top of the screen on a phone) whose input line, starting with the prompt `>_` in the mono face, is its title. The page's own actions come first under the name of its object, then actions and places. Typing matches the letters in order (word starts and runs count most), ranks within each group and marks the matched letters; a fixed height so the line stays put; "No match for …" when empty. Rows have no keys (typing goes into the search); the footer names ↑↓, Enter, Esc on desktop.
- **Card**: any content, flat (border, no shadow), a head with its title and at most its own actions. A stat tile is a card that is one link to its list.
- **Messages**: error, ok, warning, info; one sentence or a bold title plus text. **Toasts** always have a close button; errors stay until closed, successes fade after 5 s; saving never shows one.
- **Progress**: a labelled bar with count and percent for long tasks; a short wait is the button spinner.
- **Charts**: stat tile with sparkline and a caption naming its period; ranked parts as bars (one hue, largest first); one ratio a meter; a split a stack; a trend columns (past grey, current in brand with its value). Never a pie, never two y-axes. Every chart has a table view and a tooltip on hover and focus.

## Done means checked and looked at

Before reporting anything as done:

1. The CSS of the page is valid (braces balance; a broken rule silently drops all styling after it).
2. Take a screenshot at desktop width in **light and dark** (both halves, or the switch) and look at it: alignment, wrapping, crowding, readability, nothing overflowing; check contrast of every new pair (text 4.5:1, graphics 3:1).
3. Check a phone width (at least 390 px in a real browser; headless Chrome does not go below about 500 px).

Never report "built but not looked at". If a check could not run, finish it before reporting.

## Working with the owner

- Follow orders as given; if an order seems wrong, say so and ask, do not silently do something else.
- Ask before decisions that change scope or structure. Report blockers plainly instead of working around them.
- Keep the owner informed in short messages while long jobs run.
- Tick off the to-do list below as items are finished and shown to the owner.

### Iteration: how a new part enters the system

1. **Propose**: five designs on `proposals.html`, each its own section with a letter (A–E), derived from the existing foundations and components (same tokens, same patterns); they differ in real choices (structure, density, framing), not in shades. Each shows desktop and phone, light and dark, with realistic content from the apps. No captions beyond a one-line name per proposal.
   Then open them for the owner yourself (in the browser at `file:///…/ui/proposals.html#<part>`: `chrome.exe <url>` on Windows, since `start` drops the `#`; `open` on macOS, `xdg-open` on Linux); never only name the file.
2. **Pick**: the owner picks one or more; the rest are deleted.
3. **Refine**: iterate on the picked ones with the owner's comments, one round at a time, until the owner says it is done. Do not ask questions the proposals can answer; show instead.
4. **Release**: on the owner's word the part moves into its layer (`components.css`, `composed.css` or `shell.css`), its specimen into `components.html` or `shell.html`, its rule into this file, and leaves `proposals.html` and `proposals.css`.

Proposal CSS lives only in `proposals.css` (tokens only, like every layer) and is loaded only by `proposals.html`.

## To do

**Foundations** (`foundations.html`)
- [x] Colours, typography, spacing, radius and borders, sizes, icons (`off`, `fw`), elevation, motion
- [ ] Layout: page width, breakpoint, margins

**Components** (`components.html`)
- [x] Button, forms (fields, date and time, choices), labels, feedback, data, navigation and upload
- [ ] Composed parts: card, dialog, menu and bottom sheet, command palette and `?` help, stat tile
- [ ] Shell (`shell.html`): app header and nav (desktop and phone), user menu, sync state, page head, footer; whole-frame check left
- [ ] Mark, logo and app icon: `][` in a neutral token with one character in `brand`; logo is mark plus app name or a custom image; favicon and home-screen icon are exports
- [ ] Missing components from the apps: calendar (week, month), board, sign in, settings page, dashboard, one-time code: first version built, owner review open
- [ ] Still missing from the apps: unit affix (%, days), saved indicator, pill input (groups, tags), colour swatches, single-file upload button, bulk bar, history (audit), charts (stack, columns, sparkline), error display (dot matrix)

**Checks** (each needs the owner's go)
- [ ] `check.mjs`: layout shift after load, motion without reduced motion
- [ ] Touch targets: 24 px (today) or 44 px on phones

**Rollout**
- [ ] Streamline `ui.css` to the foundations and components; old token names as aliases; `make ui` in every app
- [ ] Apps: `icon-mic off`, `icon-camera off` (call), `icon-user off` (asq, tasq, auth); dates as dd.mm.yyyy text fields; long operations report progress
- [ ] Remove the old gallery (`pages/`, `examples/` with its `examples/index.html`, `screenshots/`) once nothing uses it; the overview `index.html` in the repo root stays and is kept current
- Where today's `ui.css`, `ui.js` and `partials.html` still differ from the rules (SKILL.md describes what they do today; tick off as each ships):
  - [ ] two designs (`data-design="paper"`, `Brand.Design`, the design choice in `nb-prefs` and the palette): one design
  - [ ] old token names (`--fg --muted --line --chip --sel --accent --bg`, states `--green --yellow --red --blue --grey`): the names under Foundations and look
  - [ ] header with a search field and the palette, commands and shortcuts in the user menu: the Commands button; shortcuts in the footer
  - [ ] phones: search icon and ☰ with the nav as a vertical list: no ☰, the nav scrolls sideways under the header
  - [ ] nav links with `g`+letter keys shown: no keys
  - [ ] palette rows show their key: they do not
  - [ ] session bar ("Stay signed in"): none; an expired session goes to sign in and back
  - [ ] a dialog keeps its Cancel button: no Cancel; Esc, the backdrop and × cancel
  - [ ] buttons `.round`, `.ico` and the small type: default, primary, danger; icon-only and toggle as shapes
  - [ ] footer credits `nobloat/<app>` only: product, version to the changelog, `?`, support, source
  - [ ] sign out icon `log-out`: `power`
  - [ ] date and time fields: `hh:mm:ss`, and RFC 3339 with the offset on the wire (today `components.js` takes `hh:mm` and posts the typed text; the apps post the date without a zone)
