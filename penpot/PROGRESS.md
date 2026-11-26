# Penpot screen generator: working notes

Renders screens into the Penpot file "nobloat-ui" from `apps/<app>.json` (format: `DSL.md`). Rules for all Penpot work: `../skill/design-system.md`.

**Warning:** the renderer (`lib.js`) draws header, page head, card, table, list, dialog, menu, breadcrumbs, pager, search and charts as its own token-bound boxes, not as component instances. That breaks the layer rule. Before it is used again, those parts must exist as components (layer 3) and the renderer must place only instances. The definitions in `apps/` are a one-time snapshot of the apps' pages for the migration, not a second source of truth.

## Run

1. `node serve.mjs .` in this folder (serves on 127.0.0.1:8765; the Penpot plugin fetches scripts from it).
2. In the plugin (execute_code), define the loader, then load the library:
   ```js
   storage.L = async f => { const t = await (await fetch("http://127.0.0.1:8765/" + f + "?" + Date.now())).text(); return await new Function("storage", "penpot", "penpotUtils", "return (async () => {" + t + "\n})()")(storage, penpot, penpotUtils); };
   await storage.L("lib.js");
   ```
3. `await storage.L("parts.js")` builds missing composed components (skips existing).
4. `storage.R.buildAll("<file>", "<Page name>")`, then poll `await storage.H.poll("prog", 10)` in short steps. One screen: `await storage.R.build("<file>", index)`.
5. Checks on the current page: `storage.H.checkStart()`, then `await storage.H.poll("res", 10)` (token audit, contrast, layout; light and dark; ends on light).
6. Without Penpot: `node validate.mjs apps/<app>.json` (one definition), `node dryrun.mjs` (all, against a mock).

## Status (2026-11-26)

- Definitions for all apps: validated, dry run 0 errors (423 boards). Icon names come from `../icons/`; 8 of them (e.g. `user-x`, `merge`) are not imported as Penpot components yet.
- Drawn by the old renderer (loose boxes, to be rebuilt): Templates (all checks pass in light and dark), nomail, call, up, poll, jot (partly).
- Findings from those runs, fixed in `lib.js` but not re-run: text and icons on `stage`/`tile` fills now use fixed light colours (call failed contrast in light); a fit pass after building wraps overflowing texts and rows (nomail, call, up).

## Known gaps in the design system (found while writing the definitions)

Things the apps have that no component covers yet; each is approximated in the definitions:
hint text under a field in its normal state · read-only field · monospace/code text and code blocks · chips with an icon or dot ·
key hints inside buttons · pressed state on round buttons (call) · badge anchored on a button · table footer (sum) rows, grouped rows,
inline-editable cells, select column + bulk bar · file drop zone (dashed) · pill input (groups, tags) · colour swatch/colour input ·
field with a non-currency unit (%, days) · signed durations (+12:30) · two-series chart, stacked bar, sparkline in a tile, more than 4 tiles ·
disclosure/collapsible section · dropdown/split button · stepper · timeline · rendered markdown · calendar grid (now line, overlaps) ·
QR code / image / PDF / mail previews · error-page artwork · bottom sheet as an overlay on phones · per-screen nav · user-chosen colours (tags, projects, avatars).
