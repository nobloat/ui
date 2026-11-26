# nobloat design system

Rules for any agent working on the nobloat design system. Read all of it before starting. These rules come from mistakes that were made; each one is an order from the owner, not a suggestion.

## Goal, working surface and source of truth

A reusable, sustainable design system to design new nobloat apps quickly, UI and UX.

- **Working surface: `foundations.html` and `components.html`** in the repo root (tokens in `foundations.css`, components in `components.css`, the page frame in `showcase.css`/`showcase.js`), a plain HTML page (open it in a browser, nothing to build). Each foundation is a section (Colours, Typography, then Spacing, Radius and borders, Sizes, Layout, Elevation, Motion), linked from the sticky bar at the top. Components follow on the same principle once the foundations are complete.
- **Penpot is paused.** The Penpot file nobloat-ui and the generator in `penpot/` are not developed further; the pitfalls at the end stay for reference.
- **Source of truth:** until the foundations are complete, `skill/SKILL.md`, `README.md` and `ui.css` stay the source of truth for the apps, and `foundations.html` is the proposal. Every rule in `SKILL.md` is carried into this file, so nothing is lost. When the foundations are complete, `ui.css` is streamlined once to match `foundations.html` (old token names as temporary aliases, then every app via `make ui`), and this file becomes the source of truth.
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
- **Typography:** one family for the interface, the system monospace; five roles: `title` 600 32/1.2, `heading` 600 24/1.2, `subheading` 600 18/1.3, `body` 400 14/1.6, `small` 400 12/1.6 in `muted`. Emphasis is weight 600, never another size. `prose` for running text blocks: 400 15/1.65 `ui-serif, serif`, justified and hyphenated. A hero (big intro) and numbers are components, not type roles.
- **Wrapping:** running text `hyphens: auto` and `text-wrap: pretty`, at most 70ch per line (longer text in columns); headings `text-wrap: balance`; buttons, labels and code never hyphenated; long strings `overflow-wrap: anywhere`; values joined with a non-breaking space (`1.234,56&nbsp;€`).
- **Spacing:** four steps, `space-4`, `space-8`, `space-16`, `space-32` (each double the last).
- **Radius and borders:** `radius-control` 6 px, `radius-panel` 12 px, `radius-round`; `border` 1 px `line`, `border-field` 1 px `muted` (3:1), `focus` 2 px `accent` with 2 px offset.
- **Dates and times:** always dd.mm.yyyy and hh:mm (24 h), typed into text fields with a pattern; a picker button opens the browser picker (components.js). ISO on the wire.
- **Waiting:** an unknown length (spinner) only for operations under 3 s; everything longer shows what runs and how far (count and percent), updated as it runs.
- **Headings never ALL UPPERCASE.**
- Look: 40 px controls (28 px small), every button with `radius-control`, icon-only buttons square as well, 12 px panels.

## Layers: each one only from the one below

| # | Layer | Built only from |
|---|---|---|
| 0 | Foundations: colours, typography, spacing, radius and borders, sizes, layout, elevation, motion (`foundations.html`) | – |
| 1 | Building blocks: icons, surface, divider, text styles | tokens |
| 2 | Controls: button, icon button, field, money, checkbox, radio, segmented, chip, tag, status, badge, id, key, nav item, tab, menu item, avatar, message, toast | instances of 1 |
| 3 | Composed parts: app header (desktop/phone), page head, breadcrumbs, card, dialog, menu panel, search, pager, table header and row, list row, info row, stat tile, empty state, chart bar, meter | instances of 1–2 |
| 4 | Page templates: list, detail, form, dashboard, settings, login, error, overlays (desktop and phone) | instances of 3 |
| 5 | App screens, one page per app | instances of 2–4 |

What is still missing in each layer: [To do](#to-do).

- **No copies.** A higher layer contains only component instances. Never draw a styled box (fill, stroke, radius, shadow, text style) by hand on a template or screen, not even when it is bound to tokens. Only plain layout wrappers without styling (a row or column with a gap) and the screen board itself may be loose.
- **Containers have content slots.** Card, dialog, panel, table row and list row are components whose content differs per use. Build them with slots (a placeholder instance that is swapped per use) so the container still follows its main. Test how slots behave in Penpot before building on them, and show the owner.
- **One layer at a time.** Finish a layer, check it (below), show it to the owner, then build the next. Screens are the very last step.
- **App screens are consumers, not the system.** Build them app by app, simplest first (auth, call), not all at once. A part enters the system (layer 2–3) when two apps need it; otherwise it stays on the app's page.
- **Change once, everywhere.** A token or main component change must reach every template and screen. If it would not, the layer rule was broken.

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

- **Few variants:** only what a designer picks in a mockup. Hover, focus, disabled are documented once on a "States" board, not as variants.

### Icons and buttons

- Icons come only from `icons/` (16×16 grid, stroke 1.25, square ends, sharp joins, current colour), imported, never drawn in Penpot. A missing icon is added to `icons/` first (`README.md`: Adding an icon).
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
- Ask before decisions that change scope or structure. Report blockers plainly (for example the plugin tab asleep) instead of working around them.
- Keep the owner informed in short messages while long jobs run.
- Tick off the to-do list below as items are finished and shown to the owner.

## To do

**Foundations** (in `foundations.html`, one section each)
- [x] Colours
- [x] Typography
- [x] Spacing
- [x] Radius and borders
- [x] Sizes (controls, targets, icons)
- [x] Icons (from icons/; `off` strikes any icon through)
- [ ] Rollout: call (mic-off, camera-off), asq and tasq/auth (user-x) switch to `icon-… off` when ui.css is copied
- [ ] Layout (page width, breakpoint, margins)
- [x] Elevation (one token, `shadow-overlay`, for what floats)
- [x] Motion (duration-fast, duration-slow, ease, spin; zero with reduced motion)
**Components** (in `components.html`, styles in `components.css`, built only from `foundations.css`)
- [x] Button (default, primary, danger, quiet, toggle, icon-only, small, key hint, group; phone: icon only and full-width primary; states shown once)
- [x] Field (text, select, textarea; label, hint, error; focus and error on the border; read-only dashed)
- [x] Checkbox, radio, segmented (choice with label, whole row the target; segmented on radios)
- [x] Labels: status (dot and word on a tint), filter chip, tag, badge, object id

- [x] Feedback: message, toast, progress and meter, empty state
- [x] Data: table, row list, info grid, ranked bars
- [x] Navigation and upload: tabs, pager, drop zone
- [ ] Composed parts: card, dialog, menu, command palette, stat tile

- [ ] Streamline `ui.css` to the foundations, roll out with `make ui`

Step by step, one layer at a time. Done so far: layers 0–2, and stat tile, message, toast, menu item, nav item, tab, avatar.

**Layer 1–2 (controls)**
- [ ] Import the missing icons (8, e.g. `user-x`, `merge`; see `penpot/PROGRESS.md`)
- [ ] Brand token (light and derived dark shade) wired into primary button, selection and highlight
- [ ] Mark (layer 1, after the brand token): `][` in a neutral token, one character as a text slot in `brand`; one component, no per-app variants (as `favicon.svg` and `nb-mark`, whose bare hex colours become tokens)
- [ ] Logo (layer 2): Mark plus app name, swappable for a custom logo image with a dark variant (`Brand.Logo`, `Brand.LogoDark`)
- [ ] App icon (layer 2): Mark as favicon and home-screen icon; sizes are exports, not variants. Apps set character and brand only on their own screens (layer 5)
- [ ] Key hint (`kbd`) inside buttons, menu rows and nav items
- [ ] Field: hint text in the normal state, read-only, unit affix other than currency (%, days)
- [ ] Chip with icon or dot and count
- [ ] Badge anchored on a button
- [ ] Code text and code block
- [ ] Pill input (groups, tags), colour swatches with custom colour
- [ ] Drop zone (upload), single-file upload button
- [ ] Progress bar (known and unknown length), button spinner on the States board
- [ ] Saved indicator ("✓ saved 14:02"), field error line (wrong + valid example)
- [ ] Signed durations (+12:30)

**Layer 3 (composed parts)**
- [ ] App header desktop and phone, user menu, nav as vertical list on phones
- [ ] Page head, breadcrumbs (desktop and "← parent")
- [ ] Card, dialog, menu panel and bottom sheet, each with content slots (test slots first and show the owner)
- [ ] Search with grouped results; command palette; `?` help
- [ ] Pager; table header and row (sortable, footer sum, grouped rows, select column) and bulk bar; table as cards on phones
- [ ] List row (dot, title, meta, number, row buttons)
- [ ] Info row and info grid; history (audit)
- [ ] Empty state
- [ ] Charts: bars, meter, stack, columns, sparkline in a tile, two-series with legend
- [ ] Session bar
- [ ] Disclosure section, split button, stepper, timeline
- [ ] Calendar grid: week (now line, overlaps), month, phone day view
- [ ] Error display (dot matrix) and the ][◆ drawings per code

**Layer 4 (templates, desktop and phone)**
- [ ] Rebuild list, detail, form, dashboard, settings, login, error, overlays from instances only (the current ones are loose boxes)
- [ ] Add dates, week, month and status (as in `pages/`)

**Layer 5 (app screens)**
- [ ] Change the generator's renderer (`penpot/lib.js`) to place only instances
- [ ] auth, then call; then the others one by one, each shown to the owner
- [ ] Delete the old loose-box pages (nomail, call, up, poll, jot)

**Checks and code (ideas from ui-skills.com, not Penpot work; each needs the owner's go)**
- [ ] `check.mjs`: layout shift after load (CLS) and motion without `prefers-reduced-motion` (Chrome runs with reduced motion forced, so the motion case is untested today)
- [ ] `ui.css`: `text-wrap: balance` on headings, `pretty` on paragraphs (`tabular-nums` is already used)
- [ ] Touch targets: decide 24 px (WCAG AA, today) or 44 px on phones; the call look (40 px) is close to 44

**Handover**
- [ ] Carry the decided differences into `ui.css` and `SKILL.md`; this file becomes the source of truth

## Penpot (paused): plugin pitfalls

- Check `penpot.currentFile.name === "nobloat-ui"` before every write: the plugin silently connects to whichever Penpot tab is in front.
- `token.applyToShapes` **toggles**: applying a token a shape already has (also inherited from its main) removes it. Check `shape.tokens[prop]` first.
- Never remove a token to replace it: it unbinds every shape. Edit `token.value` in place.
- `theme.addSet` needs the set object; new sets start inactive; toggling a theme can leave none active (verify after every switch).
- SVG import adds a `base-background` rect (remove it) and gives rect/ellipse strokes "inner" alignment (set "center").
- Variant containers cannot hold a fill token. `resize()` resets flex sizing to fix. `setParentIndex` counts from the end in flex boards. A flex board collapsed to 0.01 px cannot be resized: rebuild it.
- `library.components` lists one entry per variant set; use `container.variants.variantComponents()`.
- `storage` is wiped when the plugin reconnects. `export_shape` only works on the active page. A call times out after ~30 s: run long jobs in the background in the plugin and poll in short steps. The `AsyncFunction` constructor is blocked; `new Function` with an async IIFE works.
- The plugin tab sleeps when the browser window is hidden or covered (energy saver, background throttling). Ask the owner to keep it visible; do not try to wake or control the browser yourself.

## Generator

`penpot/` renders screens from JSON (`lib.js`, `parts.js`, `DSL.md`, `apps/*.json`; how to run it and its status: `penpot/PROGRESS.md`). Its screen definitions are reusable; its renderer draws parts as loose boxes and must place only instances before it is used again.
