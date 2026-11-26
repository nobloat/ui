# nobloat design system

Rules for any agent working on the nobloat design system. Read all of it before starting. These rules come from mistakes that were made; each one is an order from the owner, not a suggestion.

## Goal, working surface and source of truth

A reusable, sustainable design system to design new nobloat apps quickly, UI and UX.

- **Working surface:** `foundations.html` and `components.html` in the repo root, plain HTML (open in a browser, nothing to build). Tokens in `foundations.css`, components in `components.css` and `components.js`, the page frame in `showcase.css` and `showcase.js`. Each foundation and each group of components is a section, linked from the sticky bar; the two pages link to each other at the top.
- **Source of truth:** this file and the two pages for the design system; `skill/SKILL.md`, `README.md` and `ui.css` for what the apps run today. Every rule in `SKILL.md` is carried here. When the components are complete, `ui.css` is streamlined once to match (old token names as temporary aliases, then every app via `make ui`), the old gallery (`pages/`, `examples/`, `screenshots/`) goes, and this file is the only source.
- `ui.css`, `ui.js`, `partials.html` and `skill/SKILL.md` are not changed as part of design system work unless the owner asks.

### Page rules for foundations.html

- Plain HTML and CSS, no Go templating, no build; it only loads `ui.css`.
- Each value is shown once with its name and copyable values (hex and `oklch` for colours, the CSS line for type); derived values show where they come from (a scale or a dashed arrow), never a second copy.
- Foundations only: no app content (no invoices, customers, users), no components (dots, pills, buttons belong to components). Sample text says what nobloat stands for, not lorem ipsum.
- The page uses its own tokens (colours, type roles) for itself, so it proves they are consistent.
- One line per item, `line` for every border and divider, calm and spacious; look at a screenshot in light and dark before showing anything.

### Decided (differs from today's ui.css)

These are decided in `foundations.html` and go into `ui.css` and `SKILL.md` at the streamlining:

- **One design** (graphite). Paper is removed.
- **Neutrals** from three sources per mode: `background`, `surface`, `text`. Two derived, mixed in OKLab (keeps greys grey): `line` (`text` 10 % on `background`: dividers, borders, chip fill, hover, inactive and decorative) and `muted` (67 %: secondary text, field edges).
- **Brand:** an app sets one colour, `brand`. `accent` is the brand adapted only where contrast would fail (OKLCH lightness at most .52 in light, at least .72 in dark). `selected` = `accent` 7 % on `background` (OKLab). `text-on-accent` is white in light and `background` in dark.
- **States**, named by meaning only, never by hue: `ok` #5f8a2e, `warn` #c2620a, `danger` #dc2626, `info` #3b82f6, `disabled` #7c7c85; one colour for both modes, for dots, icons and edges (3:1). The word next to a state stays in `text`. `danger` is also the fill of dangerous buttons with `text-on-danger` (white, 4.8:1). There is no `error`.
- **Names are descriptive:** `background`, `text`, `selected`, `text-on-accent`, not `bg`, `fg`, `sel`, `on-accent`.
- **Typography:** one family for the interface, the system monospace; five roles: `title` 600 32/1.2, `heading` 600 24/1.2, `subheading` 600 18/1.3, `body` 400 14/1.6, `small` 400 12/1.6 in `muted`. Emphasis is weight 600, never another size. `prose` for running text blocks: 400 17/1.65 `ui-serif, serif`, justified and hyphenated. A hero (big intro) and numbers are components, not type roles.
- **Wrapping:** running text `hyphens: auto` and `text-wrap: pretty`, at most `measure` (90ch of its own font) per line (longer text in columns); headings `text-wrap: balance`; buttons, labels and code never hyphenated; long strings `overflow-wrap: anywhere`; values joined with a non-breaking space (`1.234,56&nbsp;€`).
- **Spacing:** four steps, `space-4`, `space-8`, `space-16`, `space-32` (each double the last).
- **Sizes:** three: `size-icon` 16 (in an icon-only button `size-icon` + `space-4`), `size-control-small` 24 (small controls, chips, the smallest target), `size-control` 40.
- **Radius and borders:** `radius-control` 6 px, `radius-panel` 12 px, `radius-round`; `border` 1 px `line`, `border-field` 1 px `muted` (3:1), `focus` 2 px `accent` with 2 px offset.
- **Mixes:** two: `mix-tint` 8 % (hover, tinted fill) and `mix-edge` 30 % (pressed, tinted border, visited link); disabled controls `opacity-disabled` .45.
- **Elevation:** flat by default (panels and cards: a border, no shadow); three levels, each a shadow and a z-index: `raised` 10 (sticky bar, dragged row), `floating` 20 (message, menu, tooltip), `modal` 30 (dialog).
- **Links:** two kinds. Internal: `accent`, underline `stroke-thin` (`stroke-thick` on hover), offset `underline-offset`, visited dimmer. External (`target="_blank" rel="noopener"`): the same plus the `external` icon after it, at text size. Underline only on hover where the place says it is a link (tabs, table heads, row titles, breadcrumbs).
- **Breadcrumbs:** parents as `muted` links with their object icon, `chevron-right` between, the current page last in `text` without link (`aria-current="page"`); a narrow container shows only "← parent".
- **Theme switch:** auto (follows the system), light, dark; a segmented control with icon and word (`contrast`, `sun`, `moon`) where there is room, one icon-only button that cycles where not; switching is CSS alone (radios `name=theme` + `:has()`); the server renders the saved choice as the checked radio; JS only remembers it where no server does.
- **Navigation motion:** a page load cross-fades the content (`@view-transition { navigation: auto; }`, `duration-fast`, `ease`); the page header stays (`view-transition-name`); off with reduced motion; no script.
- **Modern CSS only:** custom properties, `:has()`, container queries, `light-dark()`, `color-mix()`, nesting, view transitions, logical properties; no preprocessor, no framework, no vendor-prefix workarounds, no JavaScript for what CSS can do.
- **Quote:** `figure.quote` > `blockquote` + `figcaption` (who, `cite` for the work); prose face in italic, a `stroke-thick` `line` on the left, the source small and muted.
- **Buttons:** default, primary, danger; icon-only and toggle as shapes. No quiet and no small type: a button inside another component (picker, id, message) takes a frameless 24 px look from that component.
- **Dates and times:** always dd.mm.yyyy and hh:mm (24 h), typed into text fields with a pattern; a picker button opens the browser picker (components.js). ISO on the wire.
- **Waiting:** an unknown length (spinner) only for operations under 3 s; everything longer shows what runs and how far (count and percent), updated as it runs.
- **Headings never ALL UPPERCASE.**
- Look: 40 px controls, every button with `radius-control`, icon-only buttons square as well, 12 px panels.

## Layers: each one only from the one below

| # | Layer | Where | Built only from |
|---|---|---|---|
| 0 | Foundations: colours, typography, spacing, radius and borders, sizes, icons, elevation, motion | `foundations.css` | – |
| 1 | Components: button, forms, labels, feedback, data, navigation and upload | `components.css` | tokens |
| 2 | Composed parts: card, dialog, menu, command palette, stat tile, app header, page head | `components.css` | components |
| 3 | Page templates: list, detail, form, dashboard, settings, login, error | the old gallery until it is replaced | composed parts |

- **Only tokens.** A component uses tokens and other components, never a raw colour, size or font. A tint only one component needs is a formula inside it, not a token.
- **Containers have content slots.** Card, dialog, panel and rows take any content; their own styling never depends on what is inside.
- **One step at a time.** Build a part, show it with its options, let the owner choose, then build the next.
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
- Every icon-only control has a name (shown as the tooltip in the design).

### Widths

- Frames: phone 390, desktop 1280. A phone design must also work from 320 to 500 px without sideways scrolling; the breakpoint is 640 px (40rem).
- A variant only where the structure changes; everything else is the same component.
- Phone structure: header with logo, search icon, user menu and ☰ (nav as a vertical list). Tables become one card per row with "label … value" lines (unless the table must stay a table); short lists of objects are row lists, not tables. Forms one column. Overflow menus become a bottom sheet; toasts span the width at the bottom. Create, edit, delete and copy buttons show only their icon; the primary action keeps its text and spans the width. A page form's Cancel is hidden ("← parent" does it); a dialog keeps its Cancel. No key hints.

### Variants and states

- **Few variants:** only what a designer picks in a mockup. Hover, focus, pressed, disabled and busy are shown once per component, not as variants.

### Icons and buttons

- Icons come only from `icons/` (16×16 grid, stroke 1.25, square ends, sharp joins, current colour), never drawn by hand. A missing icon is added to `icons/` first (`README.md`: Adding an icon).
- **Every button has an icon, before the text, no exceptions** (actions, OK and Cancel, Close, tabs, pager, chips, menu items, icon-only buttons). Links out carry `external` after the text; messages, states, units and empty states carry theirs. Plain links in text and form labels get none.
- The same action has the same icon everywhere. Actions: confirm/save/OK `check` · cancel/close `x` · back `arrow-left` · next `arrow-right` · new `plus` · delete `trash` · archive `archive` · edit `edit` · copy `copy` · undo/reset `undo` · retry/reload `refresh` · random name or id `dice` · upload `upload` · download/export `download` · send `send` · comment `chat` · preview `eye` · print `print` · merge `merge` · sign in `log-in` · sign out `power` · lock/unlock `lock`/`unlock` · filter `filter` · search `search` · help `help` · more `more`. Places: dashboard `dashboard` · list `list` · board `columns` · calendar `calendar` · time `clock` · person `user` · people `users` · nobody `user-x` · company `building` · project `folder` · tag `tag` · settings `cog` · keys `key` · money `euro` · document `file` · source `code` · language `globe` · reports `chart` · mail `mail` · home `home` · link `link`. Chip states: all `list` · active/done `ok` · waiting `pause` · overdue/failed `warning` · archived `archive`.
- One primary button per page at most. Delete is red and always confirms, naming the object and the consequence. Dialogs always have a title.
- **Key hints on desktop**: a button with a shortcut shows it as a `kbd` after its text; an icon-only button names it in its tooltip (`Mute (m)`). Nav links show `g` + letter. Tabs, pager, chips and labels show none. Menu and palette rows show their key.

### Pages and content

- **Header**: logo, search (placeholder names `Ctrl K`), user menu (round button with the initial: name, theme, language, settings, commands, shortcuts, sign out). Nothing else loose in the header. Settings is never a nav item. Apps without a palette (call) show no `Ctrl K`.
- **Breadcrumbs** on every page below the top level, current page last without a link; phones show "← parent".
- **Page head**: title and the page's actions right of it (under it on phones). Actions never sit alone at the bottom; only a form's submit sits at its end.
- **List**: chips with counts and tags above, table or row list, pager, empty state with the create action. Sortable column headers show ↑/↓. Bulk lists: checkbox column and a bulk bar ("{n} selected").
- **Detail**: crumbs, title with state, actions (primary visible; a "more" menu only from three further actions on), tags, info grid with copyable ids (one or two facts are a muted line instead), tabs, history.
- **Dashboard**: stat tiles only for numbers that lead to an action (label, value, delta, sparkline or meter, each linking to its list), then "needs attention", then one or two charts, then recent activity. No decoration.
- **Settings**: account, preferences (language, theme), app settings, users, keys.
- **Forms**: edit forms autosave; saved shows quietly as "✓ saved 14:02" beside the form, never a toast. Create is a small form with only the required fields and one Create button. An error is one line under the field: what is wrong, then what is valid with an example. Uploads are a drop zone naming the supported files and the size limit. Single choice: segmented or select; several values: pills with ×.
- **Errors**: keep header and nav; small code, the message as title in plain words, what happened to the user's work, buttons for what to do next. 500 shows a copyable `ERR-…` reference. The codes 400 401 403 404 409 410 413 429 500 503 show a dot-matrix display of the code in the brand colour above a line drawing of the mark ][◆.
- **Session**: a bar 5 minutes before the session ends ("Stay signed in") and after it.
- **Ids** look like ticket keys (`CUS-0042`), shown as code with a copy button.
- **Money** always with the currency, a real minus sign; inputs with the unit as an affix. **Dates** ISO in lists, recent events relative; durations `h:mm`.
- **Tags** are tinted pills in a user-chosen colour from preset swatches safe on light and dark; the text keeps full contrast.
- **Messages**: error, ok, warning, info; one sentence or a bold title plus text. **Toasts** always have a close button.
- **Progress**: a labelled bar with count and percent for long tasks; a short wait is the button spinner.
- **Charts**: stat tile with sparkline and a caption naming its period; ranked parts as bars (one hue, largest first); one ratio a meter; a split a stack; a trend columns (past grey, current in brand with its value). Never a pie, never two y-axes.

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

## To do

**Foundations** (`foundations.html`)
- [x] Colours, typography, spacing, radius and borders, sizes, icons (`off`, `fw`), elevation, motion
- [ ] Layout: page width, breakpoint, margins

**Components** (`components.html`)
- [x] Button, forms (fields, date and time, choices), labels, feedback, data, navigation and upload
- [ ] Composed parts: card, dialog, menu and bottom sheet, command palette and `?` help, stat tile
- [ ] App frame: app header (desktop and phone), user menu, page head, breadcrumbs, session bar
- [ ] Mark, logo and app icon: `][` in a neutral token with one character in `brand`; logo is mark plus app name or a custom image; favicon and home-screen icon are exports
- [ ] Still missing from the apps: unit affix (%, days), saved indicator, pill input (groups, tags), colour swatches, single-file upload button, bulk bar, history (audit), charts (stack, columns, sparkline), calendar (week, month), error display (dot matrix)

**Checks** (each needs the owner's go)
- [ ] `check.mjs`: layout shift after load, motion without reduced motion
- [ ] Touch targets: 24 px (today) or 44 px on phones

**Rollout**
- [ ] Streamline `ui.css` to the foundations and components; old token names as aliases; `make ui` in every app
- [ ] Apps: `icon-mic off`, `icon-camera off` (call), `icon-user off` (asq, tasq, auth); dates as dd.mm.yyyy text fields; long operations report progress
- [ ] Remove the old gallery (`pages/`, `examples/`, `screenshots/`, `index.html`) once nothing uses it
