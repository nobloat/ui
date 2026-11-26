# nobloat design system in Penpot

Rules for any agent working on the Penpot file **nobloat-ui** (via the Penpot MCP plugin). Read all of it before the first call. These rules come from mistakes that were made; each one is an order from the owner, not a suggestion.

## Goal

A reusable, sustainable design system to design new nobloat apps quickly, UI and UX. `ui.css` stays the source of truth until the design system is complete; then the design system is. `ui.css`, `ui.js`, `partials.html` and `skill/SKILL.md` are not changed as part of Penpot work unless the owner asks.

## Layers: each one only from the one below

| # | Layer | Built only from |
|---|---|---|
| 0 | Tokens (sets `core`, `mode/light`, `mode/dark`; theme group `mode`) | – |
| 1 | Building blocks: icons, surface, divider, text styles | tokens |
| 2 | Controls: button, icon button, field, money, checkbox, radio, segmented, chip, tag, status, badge, id, key, nav item, tab, menu item, avatar, message, toast | instances of 1 |
| 3 | Composed parts: app header (desktop/phone), page head, breadcrumbs, card, dialog, menu panel, search, pager, table header and row, list row, info row, stat tile, empty state, chart bar, meter | instances of 1–2 |
| 4 | Page templates: list, detail, form, dashboard, settings, login, error, overlays (desktop and phone) | instances of 3 |
| 5 | App screens, one page per app | instances of 2–4 |

- **No copies.** A higher layer contains only component instances. Never draw a styled box (fill, stroke, radius, shadow, text style) by hand on a template or screen, not even when it is bound to tokens. Only plain layout wrappers without styling (a row or column with a gap) and the screen board itself may be loose.
- **Containers have content slots.** Card, dialog, panel, table row and list row are components whose content differs per use. Build them with slots (a placeholder instance that is swapped per use) so the container still follows its main. Test how slots behave in Penpot before building on them, and show the owner.
- **One layer at a time.** Finish a layer, check it (below), show it to the owner, then build the next. Screens are the very last step.
- **App screens are consumers, not the system.** Build them app by app, simplest first (auth, call), not all at once. A part enters the system (layer 2–3) when two apps need it; otherwise it stays on the app's page.
- **Change once, everywhere.** A token or main component change must reach every template and screen. If it would not, the layer rule was broken.

## Ground rules (hard)

- **Contrast WCAG 2.2 AA:** text 4.5:1, icons, edges and state dots 3:1, in light and in dark.
- **Light and dark** are a token theme, never component variants.
- **Phone (390) and desktop (1280)**: a variant only where the structure changes; everything else is the same component.
- Look: the call app is the reference (40 px controls, round icon buttons, 12 px panels). One design, no paper. Fonts without external dependencies (system monospace). Headings clearly distinct from body text, never ALL UPPERCASE. Colour only for state (and signed money: + green, − red, neutral).
- **Few variants:** only what a designer picks in a mockup. Hover, focus, disabled are documented once on a "States" board, not as variants.
- No component tokens; components use semantic tokens. Derived colours are precalculated (Penpot's `mix()` resolves wrong), the formula goes in the token description.

## Done means checked and looked at

Before reporting anything as done:

1. Run the checks in **light and dark**: every fill and stroke bound to a token that matches its resolved value; every text has a text style; contrast against the nearest filled ancestor; nothing overflows or collapses; **no styled shape outside a component instance**.
2. Export every new or changed board in both themes and look at it (alignment, wrapping, crowding, readability).
3. Leave the file on the **light** theme, verify that exactly one theme is active.

Never report "built but not looked at". If a check could not run, finish it before reporting.

## Working with the owner

- Follow orders as given; if an order seems wrong, say so and ask, do not silently do something else.
- Ask before decisions that change scope or structure. Report blockers plainly (for example the plugin tab asleep) instead of working around them.
- Keep the owner informed in short messages while long jobs run.

## Penpot plugin pitfalls

- Check `penpot.currentFile.name === "nobloat-ui"` before every write: the plugin silently connects to whichever Penpot tab is in front.
- `token.applyToShapes` **toggles**: applying a token a shape already has (also inherited from its main) removes it. Check `shape.tokens[prop]` first.
- Never remove a token to replace it: it unbinds every shape. Edit `token.value` in place.
- `theme.addSet` needs the set object; new sets start inactive; toggling a theme can leave none active (verify after every switch).
- SVG import adds a `base-background` rect (remove it) and gives rect/ellipse strokes "inner" alignment (set "center").
- Variant containers cannot hold a fill token. `resize()` resets flex sizing to fix. `setParentIndex` counts from the end in flex boards. A flex board collapsed to 0.01 px cannot be resized: rebuild it.
- `library.components` lists one entry per variant set; use `container.variants.variantComponents()`.
- `storage` is wiped when the plugin reconnects. `export_shape` only works on the active page. A call times out after ~30 s: run long jobs in the background in the plugin and poll in short steps. The `AsyncFunction` constructor is blocked; `new Function` with an async IIFE works.
- The plugin tab sleeps when the browser window is hidden or covered (energy saver, background throttling). Ask the owner to keep it visible; do not try to wake or control the browser yourself.

## State as of 2026-11-26

- Done: layers 0–2, and stat tile, message, toast, menu item, nav item, tab, avatar. Pages: Foundations, Components, Templates; app pages nomail, call, up, poll, jot (partly) were drawn by the old generator.
- Broken: templates and app pages were drawn from loose token-bound boxes, not instances (layer rule). They must be rebuilt after layer 3 exists.
- The generator in `penpot/` (`lib.js`, `parts.js`, `DSL.md`, `apps/*.json` screen definitions for all apps; how to run it and its status: `penpot/PROGRESS.md`) renders screens from JSON. Its screen definitions are reusable; its renderer draws parts as loose boxes and must be changed to place only instances before it is used again.
