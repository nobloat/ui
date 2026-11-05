# nobloat/ui

The shared look of nobloat apps (bill, track, tax, up, auth) as a **reference to copy from, not a dependency**: one CSS file, one JS file, Go template partials, two optional helpers (calendar, charts), and example pages that show every component in both designs. No build step, no web fonts, no icon library, no framework.

**Live: [nobloat.github.io/ui](https://nobloat.github.io/ui/)** ([preview](https://nobloat.github.io/ui/examples/preview.html)). Locally: open [`examples/index.html`](examples/index.html) in a browser; the panel at the bottom right switches design, brand color and logo (it remembers your choice across pages). [`examples/preview.html`](examples/preview.html) shows any page as desktop and in a phone frame (390×844) side by side, with the same controls; navigating in one frame moves the other.

![preview: desktop and phone side by side](screenshots/preview.png)

| plain (bill, track, tax) | nordic (up) |
|---|---|
| ![plain](screenshots/gallery-plain-light.png) | ![nordic](screenshots/gallery-nordic-dark.png) |

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

**How to use it, and every rule (layout, light/dark, mobile, accessibility, navigation, forms, money, ids, charts, keyboard):** [`skill/SKILL.md`](skill/SKILL.md). It is an [Agent Skill](https://agentskills.io) named `nobloat-ui`, so coding agents follow the same rules: link it like the other nobloat skills (`ln -s ~/git/nobloat/ui/skill ~/.claude/skills/nobloat-ui`, or `.agents/skills/nobloat-ui` per project), or tell agents without skill support to read `../ui/skill/SKILL.md`.

## Files

| file | what | in an app |
|---|---|---|
| `ui.css` | tokens, two designs, every component | `web/static/ui.css`, unchanged |
| `ui.js` | theme, shortcuts, command palette, search, autocomplete, dialogs, autosave and field errors, money input, toasts, phone tables, chart tooltips, morph | `web/static/ui.js`, unchanged |
| `partials.html` | `nb-layout`, `nb-bare`, `nb-head`, `nb-header`, `nb-crumbs`, `nb-prefs`, `nb-logo`, `nb-mark`, `nb-flash`, `nb-foot` | `web/partials.html`, unchanged |
| `calendar.js` | optional: week calendar (draw, move, resize, keys, swipe) and month day cursor; fires `cal:*` events | `web/static/calendar.js`, only on calendar pages |
| `chart.go` | optional: `Spark` and `Columns` as server-rendered SVG | copy, change the package line |
| `i18n/{en,de}.json` | the texts the partials and `ui.js` use | merge into the app's i18n files |
| `icons/*.svg`, `icons.svg` | the icon set (one file per icon) and its sprite; the CSS classes are generated into `ui.css` | use `<i class="icon-cog">`; new icons go here first |
| `favicon.svg` | the `][` mark favicon | replace `◆` and the two colors |
| `skill/SKILL.md` | the rules, for people and agents | link as a skill |
| `check.mjs` | layout and accessibility check (Node 22, Chrome) | run against the app's pages |
| `pages/*.html` | example page templates | copy the markup you need |
| `examples/*.html` | the pages rendered (generated, do not edit) | open in a browser |
| `examples/demo.js`, `calendar-demo.js`, `preview.html` | demo only: switcher, fake backend, calendar handlers, desktop + phone preview | not copied |

## Compared with the apps today

This is distilled from bill (base), up (nordic, lights, cards) and track (tag picker). Differences to watch for when migrating:

- New: breadcrumbs, settings behind ⚙ (with account and preferences), autosave on every edit form with inline field errors, icons on create/edit/delete/copy, type-prefixed ids, signed money, the dashboard and `chart.go`, tables as cards on phones, the layout and accessibility check; the command palette, `calendar.js` as events instead of track's saving code, the dates page, `--brand`/`--brand-dark` (auth computed the dark color in Go), the `.pager` component with `p`/`n` (no app paginates yet), the `aria-busy` spinner on every submit, CSS-only dark logo (auth used `<picture media>`, which ignored the toggle).
- Renamed: status classes are `ok/pend/bad/run/off` instead of app states (`paid`, `overdue`, `green`, `red`); up's `.searchbox`/`.foot` markup → `.gsearch`/`nb-foot`; track's `data-tagpick` → `data-pick` (without track's project filter and create-new-tag option, which stay app code).
- `--sel` follows the brand instead of a fixed blue.

## Development

```sh
go test ./...          # examples match pages/ + partials.html, i18n keys complete, brand rendering
go test -update ./...  # regenerate examples/*.html
node check.mjs         # every example page × plain/nordic × light/dark × 320/390/768/1280 px (+ open menu, custom logo):
                       # layout (no sideways scroll, nothing sticking out, no wrapping or clipped labels) and
                       # accessibility (contrast, names, labels, alt, ids, landmarks, target size, focus), money parsing
node check.mjs http://localhost:8080/ /customers   # the same for an app's pages
./screenshots.sh       # screenshots/*.png, needs Chrome (CHROME=…)
```

CI runs `go test` and `check.mjs` on every push. The Go module exists only for these tests; apps do not import it.
