# Screen definitions for the nobloat design system

One JSON file per app: `apps/<app>.json`. A script renders every screen twice in Penpot, desktop (1280) and phone (390), from design-system components. You only describe content and structure; never colours in hex, never pixel positions.

Validate before you finish: `node validate.mjs apps/<app>.json` (run in `ui/penpot`) must print `valid`.
The complete worked example is `apps/templates.json` (list, detail, form, dashboard, settings, login, error, overlays). Read it first.

## File

```json
{ "app": { "name": "bill", "ch": "€", "nav": ["Dashboard", "Customers", "Invoices"], "user": "P", "search": true },
  "screens": [ { "name": "Customers", "here": "Customers", "crumbs": ["Customers", "ACME GmbH"], "kids": [ ...nodes ] } ] }
```

- `app.ch`: the one character of the app's logo (`][€ bill`); take it from the app's favicon/brand. `app.nav`: the main nav labels (empty array when the app has none). `"search": false` hides the header search.
- Screen: `name` (unique, short), `here` (the active nav label, or "" for none), `crumbs` (optional breadcrumbs, last = current page), `kids` (the page content, top to bottom).
- Screen options: `"bare": true` (no app header and footer: login, public and guest pages), `"center": true` (content centred), `"narrow": 640` (max content width in px on desktop: forms, settings, login), `"fill": "stage"` (dark media background, call only), `"only": "d"` or `"p"` (render only desktop or only phone).

## Layout nodes

A node is an object with exactly one "type key". A plain string is a body text.

| Node | Meaning |
|---|---|
| `{"col": [...]}` | children top to bottom |
| `{"row": [...]}` | children left to right. `"stack": true` turns it into a column on phones (use it for every row of fields, cards or panels). `"wrap": true` wraps (chips, tags, buttons) |
| `{"card": [...], "title": "Needs attention"}` | a surface panel (white card with border) holding children |
| `{"hr": 1}` | hairline |
| `{"spacer": 1, "grow": true}` | pushes the rest of a row to the right |

Options on col/row/card: `gap` and `pad` take space names `3xs 2xs xs sm md lg xl 2xl` (2, 4, 8, 12, 16, 24, 32, 48 px); `pad` may be `[vertical, horizontal]`. `align`: `start|center|end` (cross axis), `justify`: `start|center|end|space-between`. `w`/`h`: fixed size in px (use rarely: sidebars, video tiles, calendar cells). `fill`: `bg surface chip sel hover accent line stage tile tint.blue`. `radius`: `small control panel pill`. `stroke`: `"line"` or `"line-strong"` draws a border. `shadow: true`. `clip: true`.

On any child: `"grow": true` (takes the free width in a row), `"hug": true` (do not stretch in a column), `"full": true` (stretch a button to full width), `"only": "d"|"p"` (show on desktop or phone only), `"self": "center"|"end"`.
In a column, containers and fields stretch to full width by default; buttons, chips, tags and texts keep their size.

## Text

`{"t": "text", "s": "h1|h2|body|small|label|figure", "c": "fg|muted|accent|red|green|yellow|blue|grey|on|on-tile", "wrap": true}`
- `h1` page title (use the `head` node instead), `h2` section heading, `label` small grey label, `figure` big number, `small` meta.
- `wrap: true` for any sentence that can be longer than its container. `c: "on"` only on an `accent` fill, `on-tile` only on `stage`/`tile`.
- Colour means state: red/green/yellow/blue only for states and signed money. No decoration.

## Components

| Node | Notes |
|---|---|
| `{"btn": "Label", "kind": "primary|secondary|delete", "icon": "plus", "sm": true}` | at most one `primary` per screen. Create/edit/delete/copy buttons always carry an icon (`plus`, `edit`, `trash`, `copy`). `sm` for buttons inside table and list rows |
| `{"ibtn": "more", "kind": "default|primary|danger", "size": "sm|md|lg"}` | round icon-only button |
| `{"field": "Label", "v": "value", "type": "Text|Select|Textarea", "state": "Default|Error|Saved", "msg": "…", "ph": "placeholder", "sm": true}` | `msg` only with Error/Saved. Error text names the valid form: "Not an email: e.g. a@b.example". Dates and times are Text fields with ISO values (2026-11-05, 14:30) |
| `{"mfield": "Amount", "v": "1.234,56", "cur": "EUR|USD|GBP|CHF"}` | money input, unit outside the field |
| `{"money": "1.234,56 €", "sign": "pos|neg"}` | money as text. Write the sign yourself: `+1.234,56 €` with `pos` (green), `−1.234,56 €` with `neg` (red, real minus U+2212). No sign and no `sign` = neutral |
| `{"check": "Label", "on": true}`, `{"radio": "Label", "on": true}` | |
| `{"seg": ["Auto", "Light", "Dark"], "on": 0}` | segmented single choice (2–4 short options) |
| `{"chip": "Open", "n": "12", "on": true}` | filter chip with count |
| `{"tag": "invoice", "tint": true}` | `#tag`; `tint` = a tag with a user-chosen colour |
| `{"status": "paid", "s": "ok|pending|bad|running|off"}` | state dot plus its word (never colour alone) |
| `{"badge": "3"}`, `{"id": "CUS-0042"}` (id with copy button), `{"key": "Ctrl K"}` | ids are 3 uppercase letters, hyphen, number: use the app's real id scheme |
| `{"icon": "mail", "c": "muted"}` | 16 px icon. Only names from `../icons/` (without `.svg`) |
| `{"avatar": "P"}`, `{"logo": "bill", "ch": "€"}` | |
| `{"msg": "text", "kind": "error|ok|warning|info"}` | inline message bar |
| `{"toast": "Customer created", "kind": "ok|error"}` | |

## Page parts

| Node | Notes |
|---|---|
| `{"head": "Title", "actions": [btn…], "state": {status}, "sub": node}` | page title with its actions on the right (phone: under the title, primary full width). Every screen with the app header starts with one |
| `{"tabs": ["Invoices", "History"], "on": 0}` | |
| `{"table": {"cols": [{"h": "Name"}, {"h": "Total", "w": 130, "right": true}], "rows": [[cell, …]], "sel": 1}}` | cells are strings or nodes. Give every column a `w` except the one or two that take the free width. Numbers and money: `right: true`. On phones each row becomes a card with "label … value" lines automatically. 3–6 realistic rows |
| `{"list": [{"dot": "ok", "main": "Title", "meta": "who · when", "num": "3", "act": [btn…]}]}` | row list for short lists of objects (one hairline row each) |
| `{"info": [["Label", "value or node"], …]}` | label/value grid on detail pages |
| `{"tiles": [{"tile": "Open invoices", "value": "12", "delta": "+2", "bad": true, "cap": "since Monday"}]}` | stat tiles, 2–4 |
| `{"bars": [["Label", "12.400 €", 1], ["Other", "8.100 €", 0.65]]}` | ranked bars, fraction 0..1 |
| `{"columns": [18, 22, 31], "cap": "Dec 2025 – Nov 2026"}` | column chart, last column is the current period |
| `{"meter": 0.62, "w": 200}` | one ratio / progress |
| `{"pager": "1–25 of 312"}` | usually `{"row": [{"spacer": 1, "grow": true}, {"pager": "…"}]}` |
| `{"empty": "No customers yet", "icon": "users", "btn": {btn}}` | empty state |
| `{"dialog": "Delete ACME GmbH?", "kids": [...], "actions": [btn…]}` | dialog panel; show an open dialog as its own screen or beside the page |
| `{"menu": ["Label", "-", ["cog", "Settings", "g s"], ["power", "Sign out"]]}` | menu panel: label string, "-" separator, or [icon, label, key?] |
| `{"search": "Search customers", "w": 300}` | search box |

## Rules

- A node has one type key. Do not put `col`, `row`, `icon`, `key`, `tag`, `status`… as an option on another node (the validator reports it).
- English labels (the app's `i18n/en.json`). Realistic sample data from the app's `example/` seed data and `wireframes.html`, not lorem ipsum. Austrian/German formats: dates ISO, money `1.234,56 €`.
- One screen per distinct page of the app (each page template in `web/*.html` that renders a full page, including public, guest and error pages; skip pure partials, mail templates and duplicates that differ only in data). Add a second screen for an important state of a page (empty list, open dialog, a filled form with an error) only where the wireframes show it.
- Follow the page anatomy: header, breadcrumbs below the top level, `head` with actions, then content. Lists: chips, table, pager. Detail: head with state, tags, `info`, tabs, table. Dashboard: tiles, "needs attention" list, one or two charts, recent activity. Forms: fields, then the submit at the end.
- App-specific layouts are built from `row`/`col`/`card` with fixed widths where needed: a sidebar is `{"row": [{"col": [...], "w": 240, "only": "d"}, {"col": [...], "grow": true}], "align": "start"}`; a kanban board is a row of cards; a calendar is a row of day columns; a video tile is `{"col": [...], "fill": "tile", "radius": "panel", "h": 220, "grow": true}` on a screen with `"fill": "stage"` and `on-tile` text.
- Keep it readable on a phone: mark multi-column rows `stack`, hide secondary columns with `only: "d"` only when the phone card would get very long.
