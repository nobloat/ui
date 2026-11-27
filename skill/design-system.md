# nobloat design system

Rules for any agent working on the nobloat design system. Read all of it before starting. These rules come from mistakes that were made; each one is an order from the owner, not a suggestion.

## Goal, working surface and source of truth

A reusable, sustainable design system to design new nobloat apps quickly, UI and UX.

- **Working surface:** `foundations.html`, `components.html` and `blocks.html` in the repo root, HTML (open in a browser). Tokens in `token/token.css` (base rules on elements in `token/base.css`), components in `components.css` (layer 1), blocks in `blocks.css` (2), the shell's page layout in `shell.css` (3); a part that has been split out lives in its own folder (Parts and typed pages, below), and the layer file imports it and `components.js`, the page frame in `showcase.css` and `showcase.js`. Each foundation and each group of components is a section, linked from the sticky bar; the two pages link to each other at the top.
- **One source for the rules: this file.** Every design and UX rule lives here and nowhere else. The others only show or use them: `foundations.html`, `components.html`, `blocks.html`, `shell.html` and `documents.html` show specimens, `index.html` gives the overview (philosophy, principles, architecture), `skill/SKILL.md` tells an app which markup and API carry a rule and links here, `README.md` covers setup. Never restate a rule elsewhere; link to its section. Where today's `ui.css` does not follow a rule yet, that is an item under To do → Rollout, not a second rule.
- When the components are complete, `ui.css` is streamlined once to match (old token names as temporary aliases, then every app via `make ui`) and the old gallery (`pages/`, `examples/`, `screenshots/`) goes.
- **Parts and typed pages** (`PLAN.md`): each part is a folder `<level>/<part>/` with its CSS, its template (`<part>.html`, more templates of the same part as `<name>.html`) and, only with behaviour, its JS; the layer files (`components.css`, `blocks.css`, `shell.css`) only import the folders. Its Go type (package `ui`: `components.go`, `blocks.go`, `page.go`, `button.go`, `field.go`, `form.go`) is its API: the fields are its properties, `Render` refuses what the rules forbid (a button without an icon, a second primary, a field without a label, a pattern without an example, an id twice, an error message that closes by itself). A page is a Go value; `ui.Assets` builds the CSS and JS from what the pages render. Behaviour with properties is a custom element `nb-<part>` in light DOM (today `nb-editable`): the server renders its full markup, the script only adds the behaviour, and its `observedAttributes` are exactly the `attr` tags of its type (`TestElements`); scripts share `window.nb` from `token/base.js`. Specimens are Go values in `showcase/specimens.go`; `go run ./cmd/nbui gen` writes them into the pages (every copy button with `data-spec="<name>"`, and the box between `<!--spec:<name>-->` and `<!--/spec-->`), into `fragments/`, `nb.html-data.json` and `ui.types.js`, renders `showcase/sample/` with its bundle, and writes `components.js` from the parts' scripts. The rest of the pages (state grids, captions, open menus) stays hand-written. Design system pages carry `<html data-demo>`: saving there is a stand-in.
- `ui.css`, `ui.js`, `partials.html` and `skill/SKILL.md` are not changed as part of design system work unless the owner asks.

### Keeping it in sync

Every change touches all of its places in one commit. The check in the last column fails when one is missed; a row without a check depends on you.

| Change | Also | Check |
|---|---|---|
| New icon | `icons/<name>.svg` (README: Adding an icon), `go test -update` (sprite, `icons.css`, `ui.css`, `icons_gen.go`), the grid in `foundations.html`; a row in the icon map below if it means an action or place | `TestIcons` (style, generated files) |
| New or changed token | `token/token.css`, its section in `foundations.html` (name and value once), light and dark | `TestTokensDefined` |
| New component | its folder `<level>/<part>/` (CSS, template, JS only with behaviour), imported by its layer's file; its Go type; a specimen in `showcase/specimens.go` with `data-spec` on its copy button on `components.html` (`blocks.html` for a block; `shell.html` shows whole pages), then `go run ./cmd/nbui gen`; the layer list in `index.html` if it adds a kind | `TestTokensOnly`, `TestRules`, `TestElements`, `TestGenerated` (stale output), `check.mjs` |
| New or changed rule | this file only; specimens that show it; SKILL.md only if the markup or API changes; a Rollout item if `ui.css` does not follow it yet | – |
| New page type, layer or file | `index.html` (architecture, layer graph, links) | `check.mjs` loads `index.html` |
| Anything on the design system pages | light and dark, 320 px to desktop | `check.mjs` (layout, contrast, names, icons on buttons) |

Run `go test ./...` before reporting. `node check.mjs` is off until it is fast (TODO at its top); run it by hand for a page you changed (`PAGES=ui:blocks node check.mjs`).

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
- **Mixes:** two: `mix-tint` 8 % (hover, tinted fill) and `mix-edge` 30 % (pressed, tinted border, visited link); disabled controls `opacity-disabled` .45. A filled button (primary) mixes toward its own label colour (twice `mix-tint` on hover, `mix-edge` pressed), so it shows on any brand, and lifts with `shadow-raised` on hover.
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

## Layers: each one from the ones below (a block may use other blocks)

| # | Layer | Where | Built only from |
|---|---|---|---|
| 0 | Foundations: colours, typography, spacing, radius and borders, sizes, icons, elevation, motion | `token/token.css`, `token/base.css` | – |
| 1 | Components: button, forms (incl. one-time code and editable field), labels (incl. avatar), feedback, data, navigation, arrow and upload | `components/<part>/`, the rest still in `components.css` | tokens |
| 2 | Blocks: the frame's parts (app header with nav, user menu and sync state, page head, app footer); dialog, menu and bottom sheet, card, stat tile, bulk bar, command palette, board columns, calendar (week, month), settings section; each a bigger piece built from components and other blocks (no cycles), shown on `blocks.html` | `blocks.css` | components, blocks |
| 3 | Shell: places blocks into pages, no parts of its own: the page (header, main at a readable width, footer at the bottom), phone layout, and the page templates (list, detail, form, dashboard, settings; errors are the page without nav and user menu, which auth's sign in also uses), shown on `shell.html` | `shell/<part>/` (the page), the rest still in `shell.css`; templates in `partials.html` | blocks |
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

### Screen readers

Everything a sighted user learns from the screen, a screen reader user hears. Checked by `check.mjs` (`sr:`) where a machine can.

- **Messages** announce themselves: `role="status"` for ok, info and warn, `role="alert"` for errors. A toast that closes by itself is a status, never an alert.
- **Field errors**: the field has `aria-invalid="true"` and `aria-describedby` naming the error line's `id`; the error says what is wrong and what is valid.
- **Icons**: decorative ones (next to a word) `aria-hidden="true"`; one that means something alone (a state) is `role="img"` with an `aria-label`. Icon-only controls carry the name themselves (`aria-label` and `title`).
- **Hidden means hidden**: nothing inside `aria-hidden="true"` can take focus (`tabindex="-1"` where a hidden control must exist, like the picker's native input).
- **Where am I**: a nav marks the entry that is this page with `aria-current` (`page` for places, crumbs and pages, `true` for the current filter), exactly one; breadcrumbs always (the last); a page that is none of the entries (an error page), a pager with only previous and next, and an in-page table of contents mark none. The page title (`{page} · {app}`) and the `h1` name the page.
- **Structure**: landmarks `header`, `nav` (each with an `aria-label` when there is more than one), `main`, `footer`; headings in order without skipping a level; a skip link to `main` as the first focusable element of every page with a header or nav before `main`.
- **State in attributes, not only in looks**: sorted column `aria-sort`, toggle buttons `aria-pressed`, menus and disclosures `aria-expanded` (popover and `details` give it), busy buttons and regions `aria-busy`, disabled controls `disabled` or `aria-disabled`.
- Labels are real: every field has a `<label>` (or `aria-label` where the place names it, like a search line); a group of choices is a `fieldset` with a `legend` or `role="radiogroup"` with an `aria-label`.

### Widths

- Frames: phone 390, desktop 1280. A phone design must also work from 320 to 500 px without sideways scrolling; the breakpoint is 640 px (40rem).
- A variant only where the structure changes; everything else is the same component.
- Phone structure: header with logo, the Commands icon and the user menu; no ☰ (the nav stays a bar under the header, scrolling sideways; every place is also in the palette). Tables become one card per row with "label … value" lines (unless the table must stay a table); short lists of objects are row lists, not tables. Forms one column. Overflow menus become a bottom sheet; toasts span the width at the bottom. Create, edit, delete and copy buttons show only their icon; the primary action keeps its text and spans the width. A page form's Cancel is hidden ("← parent" does it). A dialog has no Cancel button: Esc, the backdrop and × cancel, Enter takes its one action (focused on open). No key hints.

### Variants and states

- **One save at a time:** a button that started an action is busy and disabled until it is done (its icon the spinner; `aria-busy` and `aria-disabled`, not `disabled`, so a submit keeps its value); while a control saves it is disabled (`disabled`; the spinner is its only busy sign, never a second one), so nothing can change it again until the save is done or failed; the spinner says why. Other controls stay usable.
- **Layout stability:** an interaction never moves or resizes anything around it. Every state of a part (view, editing, saving, saved, failed, hover, open) has the same size; what can appear (a spinner, a check, a hint, a count) gets its space up front or floats above (menu, popover, toast). Swaps happen in place: the input takes exactly the box of the value it edits, a spinner takes the slot of the icon it replaces. Only what the user asked to grow (a disclosure, a new row) may push content down.
- **Few variants:** only what a designer picks in a mockup. Hover, focus, pressed, disabled and busy are shown once per component, not as variants.

### Icons and buttons

- Icons come only from `icons/` (16×16 grid, stroke 1.25, square ends, sharp joins, current colour), never drawn by hand; no emoji, no Unicode glyphs as icons. A missing icon is added to `icons/` first (`README.md`: Adding an icon). A chip that names data (a company, a year, a person) carries its kind's icon.
- **Every button has an icon, before the text, no exceptions**; a button that stands for a person (the user menu, a person picker) shows that person's avatar in its place (actions, OK and Cancel, Close, tabs, pager, chips, menu items, icon-only buttons). Links out carry `external` after the text; messages, states, units and empty states carry theirs. Plain links in text and form labels get none.
- The same action has the same icon everywhere. Actions: confirm/save/OK `check` · cancel/close `x` · back `arrow-left` · next `arrow-right` · new `plus` · delete `trash` · archive `archive` · edit `edit` · copy `copy` · undo/reset `undo` · retry/reload `refresh` · random name or id `dice` · upload `upload` · download/export `download` · send `send` · comment `chat` · preview `eye` · print `print` · merge `merge` · sign in `log-in` · sign out `power` · lock/unlock `lock`/`unlock` · filter `filter` · search `search` · commands `terminal` · help `help` · more `more`. Places: dashboard `dashboard` · list `list` · board `columns` · calendar `calendar` · time `clock` · person `user` · people `users` · nobody `user` `off` · company `building` · project `folder` · tag `tag` · settings `cog` · keys `key` · money `euro` · document `file` · source `code` · language `globe` · reports `chart` · mail `mail` · home `home` · link `link` · photo `photo` · video `video` · live photo `live-photo` · logs `logs` · audit `audit` · shell `window` · support `support`. Chip states: all `list` · active/done `ok` · waiting `pause` · overdue/failed `warning` · archived `archive`.
- One primary button per page at most. Delete is red and always confirms, naming the object and the consequence. Dialogs always have a title.
- **Key hints on desktop**: a button with a shortcut shows it as a `kbd` after its text; an icon-only button names it in its tooltip (`Mute (m)`). Nav links show no keys (places are in the palette); Settings is `Ctrl ,`. Tabs, pager, chips and labels show none. Menu rows show their key; palette rows do not (typing goes into the search).
- **Keys**: `c` create, `e` edit, `Del` delete, `j`/`k` rows, `Enter` open, `Esc` leaves a field, closes, or goes one breadcrumb up, `?` help, `Ctrl K` palette, `Ctrl ,` settings. Every shortcut also has a visible control. `?` lists only what works on this view. Handled keys never type into fields. Options of a form (checkboxes, radios, choices a user votes on) get no letter or digit keys. Shortcuts need at most Shift on a German/Austrian ISO layout: never brackets, braces, backslash, `@` or anything behind AltGr. Phones show no key hints.

### Dates and times

- **Shown** to the user always as `dd.mm.yyyy` and `hh:mm:ss` in 24 h (`27.11.2026 14:05:00`), in the user's time zone; lists and other dense places show `hh:mm` with the full time in `title`. Never the US order, never AM/PM, never ISO on screen. Recent events may read relative ("2 h ago") with the exact date and time in `title`. Durations `h:mm`.
- **Entered**: every date or time field is a text field the user can always type into by hand, `dd.mm.yyyy` and `hh:mm:ss` (24 h; `hh:mm` is accepted and gets `:00`), with a pattern, a sample as placeholder and the usual one-line error naming the valid form. A picker button beside it opens the browser's own picker (`components.js`) and writes the choice back in the same form. The picker is a help, never the only way in.
- **Sent** to the server always as RFC 3339 **with the time zone offset**, never without: `2026-11-27T14:05:00+01:00`. The offset is the user's zone (the browser's) at that date, so summer time is right. A date alone is the start of that day: `2026-11-27T00:00:00+01:00`. A value without an offset is refused by the server, not guessed. The page converts on submit; the text field the user sees keeps the local form.
- **Stored and passed between apps** as RFC 3339 with the offset; the server renders it back in the user's zone.


- **Header**: logo left; right the Commands button (`terminal`, `Ctrl K`; opens the palette, searching is one of its commands; icon only on phones) and the user menu (the avatar: who, theme, language, the app's rows (shortcuts are in the footer), then Settings and Sign out after a line, fixed in every app). Apps that work offline add their sync state before Commands, a status: synced (with the time in its title), syncing n of m with percent and a progress bar, offline · n waiting, sync failed; on phones only the dot. Sign out is a POST form, never a GET link. Nothing else loose in the header. Settings is never a nav item. Apps without a palette (call) show no Commands button.
- **Footer**: at the end of every page with a signed-in user, small and muted under a hairline. Left the product `][◆ nobloat/<app>` (links to nobloat.org) and its version (links to its changelog entry); right `?` shortcuts (desktop only), support (`support` icon; a new issue with page, version and browser filled in) and source. Nothing else.
- **Changelog**: every app has one, every version an entry with its date, written for users in plain words: what you can do now, what works differently, what was fixed as you saw it. No technical detail: no refactors, dependencies, commit hashes or internal names.
- **Autosave**: everything a user edits is saved as they go (on change, text after a pause); there is no Save button. Buttons create, send or delete, never save. While it saves, a spinner shows at the field (never a silent wait); then a short saved confirmation. A failed save shows at the field and keeps the input.
- **Avatar**: a person is a round picture, or the initial where there is none, always with the name beside it or in its label (`aria-label`, `title`); 40 px, small (24 px) in rows. It is the icon of a button that stands for that person.
- **Arrow**: connects parts in a diagram or flow: a muted line with a head right, left, down, up or both ways (left-right, up-down); solid for what is, dashed for what is optional, planned or indirect; a short label on either side (above and below a horizontal one, left and right of a vertical one). It stretches to the space between the parts.
- **Editable field**: a value that saves on its own (settings, a detail page) is its text with a pencil at the end; the pencil edits it in place with the right input type, Enter or leaving saves, Esc puts the old value back. Its hint line is there from the start; an invalid value's error takes the hint's place. Saving: the value dimmed, the pencil a spinner (disabled), then a check for 2 s; a failed save opens it again with the typed value and an error toast.
- **One-time code**: one plain field with a normal label, big centred digits; digits only, at most six (`inputmode="numeric"`, `maxlength="6"`, `pattern="[0-9]{6}"`); a pasted code is cleaned first ("123 456" → 123456); `autocomplete="one-time-code"` and `name="totp"` so password managers fill it. Never six inputs.
- **Board columns**: one column per state: a stroke in the state colour on top, the name (shortened with … when long, full in its title), the count muted and always at the same place on the right, then new; an empty column says so. The items are the app's own (tasq's cards are tasq's). Phones: one column wide with the next peeking, swiping snaps; a mouse gets a thin scrollbar.
- **Calendar**: week: hours down, days across, the week number (W48) in the corner, today's head in the accent, a line at now, closed days on the background, the grid opens at the working day and scrolls inside itself; phones show the week as an agenda (each day, its entries as rows with their times). Month: the month and year on top, each day a link to its week. The entries and the line under each day's name are the app's own (track: hours booked). `calendar.js` moves and reports, the app saves; without it every entry is a link.
- **Settings page**: every app has one, at `/settings`, opened by `Ctrl ,` and from the user menu; never a nav item. Built from settings sections, a block (`blocks.css`, shown on `blocks.html`): one per topic, the topic and one line left, its controls right, stacked on phones; the page is only a stack of them. First section always **Account**: who (user, e-mail, name, in that order), the groups from auth as tags, signed in via auth with a link to manage the account there, then language and theme (the same controls as the user menu, no section of their own); Sign out (a POST form) at the end of the User row. Then the app's own sections, built only from existing form controls; every field saves as it changes, never a save button: text, number and date values are editable fields (the value with a pencil, edited in place, saving and saved at the field); checkboxes, radios, segmented controls and selects save on change: the value changes at once, a spinner after the control while saving (none when it takes under half a second), a check for 2 s when saved; a failed save puts the old value back and shows an error toast naming the setting (it stays until closed). A dangerous action sits under its topic. A collection (companies, desks, projects) is a list whose rows open their edit page, with New. A dangerous section comes last.
- **Dashboard**: stat tiles first, then cards with what needs doing; both in as many columns as fit. Phones: one tile per row at the full width and low (label and change left, the value right, the chart a thin line under them).
- **Nav**: the app's places as a tab bar inside the header under its row: icon, name, a badge for what waits; no keys (every place is in the palette); the current place underlined in the accent. On phones it scrolls sideways; every place is also in the palette. Settings is never a nav item.
- **Installable**: every app is a PWA: `manifest.webmanifest`, `app-icon.svg`, `app-icon-192.png`, `app-icon-512.png` (also maskable) and `app-icon.png` (180, Apple) in its `web/static/`, written by `ui/appicon.sh` from the app's char and colour and committed; `partials.html` links them. No service worker for installing; apps that work offline bring their own.
- **App icon**: the mark in white on a full square in the brand colour (the platform rounds or masks it), the mark inside the middle 60 %. Favicon: the mark alone (`favicon.svg`). Logo: mark and app name. One source: the mark; never drawn separately.
- **Title tag**: `{page} · {app}`, most specific first (tabs cut from the right; the favicon names the app): `Invoices · bill`, `INV-2026-0042 · bill`, `New invoice · bill`, `404 · Not found · bill`, `Sign in · bill`. The page part is the h1 without its state; a custom brand puts `Brand.Name` for the app. A count first, `(3) Invoices · bill`, only for what waits.
- **Breadcrumbs** on every page below the top level, current page last without a link; phones show "← parent".
- **Page head**: title and the page's actions right of it (under it on phones). Actions never sit alone at the bottom; only a form's submit sits at its end.
- **List**: chips with counts and tags above, table or row list, pager, empty state with the create action. Sortable column headers are links and show ↑/↓. A table when people compare values across columns; a row list for short lists of objects with a few facts. Bulk lists: checkbox column and a bulk bar ("{n} selected"); a destructive bulk action confirms with the count.
- **Detail**: crumbs, title with state, actions (primary visible; a "more" menu only from three further actions on), tags, info grid with copyable ids (one or two facts are a muted line instead), tabs, history.
- **Dashboard**: stat tiles only for numbers that lead to an action (label, value, delta, sparkline or meter, each linking to its list), then "needs attention", then one or two charts, then recent activity. No decoration.
- **Settings**: account (with language and theme), the app's sections, danger last.
- **Prevent input errors**: make a wrong value impossible or unlikely before handling it: the right input type and `inputmode`, `min`/`max`, `pattern`, `maxlength`, a realistic sample as placeholder, defaults that are usually right; a fixed set of values is a segmented control, select or picker, never free text; input is cleaned before it is checked (spaces in an IBAN or code, a comma as decimal point). An error message is the last resort.
- **Forms**: on phones every control spans the width: inputs, selects, segmented controls (each choice an equal share) and the primary button; short values (a number of days, a time) keep their size. Edit forms autosave; saved shows quietly as "✓ saved 14:02" beside the form, never a toast. Create is a small form with only the required fields and one Create button. An error is one line under the field: what is valid, with an example. A field that can be invalid keeps that line from the start, used by its hint; the error takes the hint's place and the hint comes back when the value is fixed, so nothing moves. A save that fails on the server is an error toast, not a field error. Uploads are a drop zone naming the supported files and the size limit. Single choice: segmented or select; several values: pills with ×.
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
- **Messages**: error, ok, warning, info; one sentence or a bold title plus text. **Toasts** always have a close button; errors stay until closed; others may close by themselves after `duration-read` (5 s, longer for longer text), and then a bar along the bottom edge runs down to show the time left; hover or focus pauses it; with reduced motion the bar is hidden and the message still closes. Saving never shows one.
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
   One part per iteration: split a compound part into its pieces and iterate them in order (board: the columns first, then the cards in them); the proposals vary only the piece under iteration, everything else stays neutral placeholder.
2. **Pick**: the owner picks one or more; the rest are deleted.
3. **Refine**: iterate on the picked ones with the owner's comments, one round at a time, until the owner says it is done. Do not ask questions the proposals can answer; show instead.
4. **Release**: on the owner's word the part moves into its layer (`components.css`, `blocks.css` or `shell.css`), its specimen into `components.html`, `blocks.html` or `shell.html`, its rule into this file, and leaves `proposals.html` and `proposals.css`.

Proposal CSS lives only in `proposals.css` (tokens only, like every layer) and is loaded only by `proposals.html`.

## To do

**Foundations** (`foundations.html`)
- [x] Colours, typography, spacing, radius and borders, sizes, icons (`off`, `fw`), elevation, motion
- [ ] Layout: page width, breakpoint, margins

**Components** (`components.html`)
- [x] Button, forms (fields, date and time, choices), labels, feedback, data, navigation and upload
- [ ] Blocks (`blocks.html`): card, dialog, menu and bottom sheet, command palette and `?` help, stat tile
- [ ] Shell (`shell.html`): the settings and dashboard pages are assembled; the other templates (list, detail, form, errors) next
- [ ] Mark, logo and app icon: `][` in a neutral token with one character in `brand`; logo is mark plus app name or a custom image; favicon and home-screen icon are exports
- [x] Board columns (released; the cards are tasq's own)
- [x] Calendar week and month (released)
- [x] One-time code (released, Forms)
- [ ] Settings section and editable field: behaviour into `ui.js` (a real POST instead of the stand-in), then each app's `/settings` rebuilt from the block
- [ ] Still missing from the apps: unit affix (%, days), saved indicator, pill input (groups, tags), colour swatches, single-file upload button, bulk bar, history (audit), charts (stack, columns, sparkline), error display (dot matrix)

**Checks** (each needs the owner's go)
- [ ] `check.mjs`: make it fast (TODO at its top), then back into CI and the before-reporting step
- [ ] `check.mjs`: layout shift after load, motion without reduced motion
- [ ] Touch targets: 24 px (today) or 44 px on phones

**Rollout**
- [x] Split every part into its folder with a Go type and specimens (PLAN.md phase 2); `nbui gen` writes the specimens into the pages, `fragments/`, `nb.html-data.json`, `ui.types.js`. Not typed yet: calendar week and month, sync state (their markup is the app's, `calendar.js` moves them)
- [ ] Apps move to typed pages one at a time, auth first: `go -C ../ui run ./cmd/nbui copy -to ../<app>/ui` and `ui.WriteAssets` in the app's test
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
  - [ ] toasts that close by themselves: the bar on the bottom edge and the pause on hover or focus (`data-auto`)
  - [ ] date and time fields: `hh:mm:ss`, and RFC 3339 with the offset on the wire (today `components.js` takes `hh:mm` and posts the typed text; the apps post the date without a zone)
