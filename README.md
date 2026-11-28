# nobloat/ui

The shared look of nobloat apps (bill, track, tax, up, auth) as a **reference to copy from, not a dependency**: one CSS file, one JS file, Go template partials, two optional helpers (calendar, charts), and example pages that show every component in both designs. No build step, no web fonts, no icon library, no framework.

**Live: [nobloat.github.io/ui](https://nobloat.github.io/ui/)** ([preview](https://nobloat.github.io/ui/examples/preview.html)). Locally: open [`examples/index.html`](examples/index.html) in a browser; the panel at the bottom right switches design, brand color and logo (it remembers your choice across pages). [`examples/preview.html`](examples/preview.html) shows any page as desktop and in a phone frame (390×844) side by side, with the same controls; navigating in one frame moves the other.

![preview: desktop and phone side by side](screenshots/preview.png)

| **graphite**: pencil on drafting paper, precise and calm (the default) | **paper**: a form on paper, drawn and filled in by hand |
|---|---|
| ![graphite](screenshots/gallery-graphite-light.png) | ![paper](screenshots/gallery-paper-light.png) |
| ![graphite dark](screenshots/gallery-graphite-dark.png) | ![paper dark](screenshots/gallery-paper-dark.png) |

Desktop and phone (500 px, dark):

| page | desktop | phone |
|---|---|---|
| dashboard | ![dashboard](screenshots/dashboard-desktop.png) | ![dashboard phone](screenshots/dashboard-phone-dark.png) |
| list | ![list](screenshots/list-desktop.png) | ![list phone](screenshots/list-phone-dark.png) |
| detail | ![detail](screenshots/detail-desktop.png) | ![detail phone](screenshots/detail-phone-dark.png) |
| form | ![form](screenshots/form-desktop.png) | ![form phone](screenshots/form-phone-dark.png) |
| settings | ![settings](screenshots/settings-desktop.png) | ![settings phone](screenshots/settings-phone-dark.png) |
| login | ![login](screenshots/login-desktop.png) | ![login phone](screenshots/login-phone-dark.png) |

Custom brand (`--brand: #7c3aed`, logo with a dark variant): ![brand light](screenshots/brand-light.png) ![brand dark](screenshots/brand-dark.png)

**Every rule (layout, light/dark, mobile, accessibility, navigation, forms, money, ids, charts, keyboard):** [`skill/design-system.md`](skill/design-system.md), the only source. **How an app uses it** (markup, classes, ui.js): [`skill/SKILL.md`](skill/SKILL.md). It is an [Agent Skill](https://agentskills.io) named `nobloat-ui`, so coding agents follow the same rules: link it like the other nobloat skills (`ln -s ~/git/nobloat/ui/skill ~/.claude/skills/nobloat-ui`, or `.agents/skills/nobloat-ui` per project), or tell agents without skill support to read `../ui/skill/SKILL.md`.

## Typed pages

A page of a Go app is a Go value; ui renders it, refuses what the rules forbid and builds the CSS and JS from what the pages use ([`PLAN.md`](PLAN.md), rules in [`skill/design-system.md`](skill/design-system.md) → Parts and typed pages, usage in [`skill/SKILL.md`](skill/SKILL.md) → Typed pages).

![demo: a page written in Go, rendered, checked and shipped (67 s)](video/demo.png)

```go
ui.Render(w, lang, texts, ui.Page{Title: "Users", Header: &header, Footer: &footer,
	Head: &ui.PageHead{Title: "Users", Actions: []ui.Button{{Label: "New user", Icon: ui.IconPlus, Key: "c", Primary: true, Href: "/users/new"}}},
	Main: ui.Table{Columns: cols, Rows: rows},
})
```

| | |
|---|---|
| parts | `token/`, `components/<part>/`, `blocks/<part>/`, `shell/<part>/`: CSS, template, script only with behaviour; Go types in `components.go`, `blocks.go`, `page.go`, `button.go`, `field.go`, `form.go` |
| into an app | `go -C ../ui run ./cmd/nbui copy -to ../<app>/ui` (`-check` in CI); `ui.WriteAssets("web/static", *update, pages...)` in the app's test |
| regenerate | `go run ./cmd/nbui gen`: the specimens on `components.html` and `blocks.html`, `fragments/`, `nb.html-data.json`, `ui.types.js`, `components.js`, `showcase/sample/`, `screens/auth/` (`go test ./...` fails when any is stale) |
| screens | [`screens/auth/`](screens/auth/index.html): every screen of auth; [`showcase/sample/`](showcase/sample/index.html): an app's dashboard, list, settings and form |
| not in Go | `fragments/<part>.html` (markup), `nb.html-data.json` (VS Code `html.customData`), `ui.types.js` (JSDoc, `// @ts-check`) |
| demo | `make video` (`go run ./video video/demo.png`: headless Chrome over the DevTools protocol, an animated PNG (full colour, plays as an image everywhere) from Go's standard library) |

## Files

| file | what | in an app |
|---|---|---|
| `ui.css` | tokens, two designs, every component | `web/static/ui.css`, unchanged |
| `ui.js` | theme, shortcuts, command palette, search, autocomplete and pill picker, dialogs, autosave and field errors, money input, toasts, phone tables, chart tooltips, morph | `web/static/ui.js`, unchanged |
| `partials.html` | `nb-layout`, `nb-bare`, `nb-head`, `nb-header`, `nb-crumbs`, `nb-prefs`, `nb-logo`, `nb-mark`, `nb-flash`, `nb-foot` | `web/partials.html`, unchanged |
| `calendar.js` | optional: week calendar (draw, move, resize, keys, swipe) and month day cursor; fires `cal:*` events | `web/static/calendar.js`, only on calendar pages |
| `chart.go` | optional: `Spark` and `Columns` as server-rendered SVG | copy, change the package line |
| `i18n/{en,de}.json` | the texts the partials and `ui.js` use | merge into the app's i18n files |
| `icons/*.svg`, `icons.svg`, `icons.css` | the icon set (one file per icon), its sprite, and the icon classes alone for pages without `ui.css`; the classes are generated into `ui.css` and `icons.css` | use `<i class="icon-cog">`; new icons go here first; a page without ui.css (public pages) loads a copy of `icons.css` |
| `favicon.svg` | the `][` mark favicon | replace `◆` and the two colors |
| `skill/design-system.md` | the rules, the one source | read by the skill |
| `skill/SKILL.md` | how an app uses ui (markup, classes, ui.js) | link as a skill |
| `cmd/nbui` (`nbui check`), `browser/` | layout and accessibility check in Chrome and Firefox, and every button has an icon; `browser/` drives both from Go (DevTools protocol, WebDriver BiDi) | run against the app's pages |
| `pages/*.html` | example page templates | copy the markup you need |
| `examples/*.html` | the pages rendered (generated, do not edit) | open in a browser |
| `examples/demo.js`, `calendar-demo.js`, `preview.html` | demo only: switcher, fake backend, calendar handlers, desktop + phone preview | not copied |

## Compared with the apps today

This is distilled from bill (base), up (lights, cards) and track (tag picker). Differences to watch for when migrating:

- New: breadcrumbs, settings behind ⚙ (with account and preferences), autosave on every edit form with inline field errors, icons on create/edit/delete/copy, type-prefixed ids, signed money, the dashboard and `chart.go`, tables as cards on phones, the layout and accessibility check; the command palette, `calendar.js` as events instead of track's saving code, the dates page, `--brand`/`--brand-dark` (auth computed the dark color in Go), the `.pager` component with `p`/`n` (no app paginates yet), the `aria-busy` spinner on every submit, CSS-only dark logo (auth used `<picture media>`, which ignored the toggle).
- Renamed: status classes are `ok/pend/bad/run/off` instead of app states (`paid`, `overdue`, `green`, `red`); up's `.searchbox`/`.foot` markup → `.gsearch`/`nb-foot`; track's `data-tagpick` → `data-pick` (without track's project filter and create-new-tag option, which stay app code).
- `--sel` follows the brand instead of a fixed blue.

## Adding an icon

The set has one style, **precise**: thin lines, square ends, sharp corners, drawn in the text color. `go test` refuses icons that leave it.

1. Check the [icons page](examples/icons.html) first: reuse an icon whose picture fits, even if its name differs (`send` also means "remind").
2. Name it after what it shows, lowercase with dashes: `trash`, not `delete`; `arrow-left`, not `back`.
3. Copy an existing file in `icons/` and replace only the drawing inside. The root element stays exactly
   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="square" stroke-linejoin="miter">`.
4. Draw on the 16×16 grid within 2…14 (to 1.5…14.5 for round shapes), points on whole or half coordinates; straight lines horizontal, vertical or at 45°; circles and corner radii up to 1.5 are fine. Square ends extend each line by 0.6, keep that inside the box.
5. Lines only. The only fills are small dots (`<circle r=".9…1.1" fill="currentColor" stroke="none"/>`) for points such as the dot of `info`. No text, no perspective, one idea per icon.
6. `go test -update ./...` writes the class `icon-<name>` into `ui.css` and the symbol into `icons.svg`. Look at it on the icons page: next to its neighbors, in every color, at 12 and 16 px.
7. Commit the svg, `ui.css` and `icons.svg` together; apps pick it up with the next copy of `ui.css` (and `icons.svg` if they use the sprite).

## Development

Every page works in current Chrome and Firefox (`skill/nobloat` → Browsers). Go, Chrome and Firefox are all it needs (`CHROME=…`, `FIREFOX=…` to override where they are); no Node.

```sh
make test              # go vet, go test: examples match pages/ + partials.html, i18n keys complete, brand rendering, the browser driver
go test -update ./...  # regenerate examples/*.html
make gen               # regenerate what comes from the Go types (nbui gen)
make check             # every example page × graphite/paper × light/dark × 320–430, 768, 1280 px (+ open menu, custom logo, long data),
                       # in Chrome and Firefox: layout (no sideways scroll, nothing sticking out, no wrapping or clipped labels) and
                       # accessibility (contrast, names, labels, alt, ids, landmarks, target size, focus), the picker, money parsing
make check ARGS="-pages ui:blocks,list -browsers firefox"
go -C ../ui run ./cmd/nbui check http://localhost:8080/ /customers   # the same for an app's pages (Git Bash on Windows: MSYS_NO_PATHCONV=1)
make video             # video/demo.png
make screenshots       # screenshots/*.png, needs Chrome (CHROME=…)
```

CI runs `make test` on every push. The Go module is also the typed UI (`PLAN.md`): apps that moved to it get a copy with `go -C ../ui run ./cmd/nbui copy -to ../<app>/ui`; the others still copy `ui.css`, `ui.js` and `partials.html`.
