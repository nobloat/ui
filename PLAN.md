# Plan: typed UI descriptions, parts per level, auth screens, the system on the index

Status: confirmed by the owner on 2026-11-27, every open question with its default; work happens on `main`. Covers `TODO.md` tasks 1 to 3.

## Goal

A page of a nobloat app is a Go value. The compiler checks it, ui renders it, and the app gets exactly the CSS and JS its pages use. No npm and no build tool other than Go. Apps written in another language still get the markup, the assets and editor help.

## Decisions

1. **Screens are Go values** (direction A). A handler builds the value with plain Go (`if`, loops); no logic in templates. Texts are i18n keys (`ui.Text`), resolved in the request's language at render. Icons are generated constants (`ui.IconLogIn`), so a wrong name does not compile.
2. **Every part renders through its own small `html/template`**, embedded in the binary: escaping by the standard library, markup that reads like the specimen.
3. **Slots are open:** a container's slot is a `ui.Node`, any part fits (Rules: Containers have content slots).
4. **Assets come from usage:** rendering records every part it used. An app's test renders each of its screens with sample data and writes one `ui.css` and one `ui.js` (tokens first, then levels in order). The same test fails when the committed bundle is stale (`go test -update` rewrites it). No dependency lists: a part that renders another part uses it.
5. **The showcase is generated:** specimens are Go values; `go run ./cmd/nbui gen` writes `components.html`, `blocks.html` and `shell.html`. One source of the markup. `foundations.html` and `index.html` stay hand-written (no parts on them).
6. **App parts are app types** with a `Render` method; they fit any slot like ui's own.
7. **Forms are plain `<form>` posts.** The handler validates and renders the page again with `Err` on the field. Autosave, confirm and the like come from the part's attributes and its custom element.
8. **Custom elements only where there is behaviour,** in light DOM, never shadow DOM; the server renders the full markup, the element only enhances it (works without JS). An element's `static observedAttributes` is its attribute list; a Go test checks it against the struct fields tagged `attr:"…"`.
9. **Packages per level:** tokens, components, blocks, shell; each part a folder. `nbui copy` copies the Go package and the assets into an app unchanged; `nbui copy -check` fails on drift (replaces `make ui-check` for migrated apps).
10. **For apps not in Go**, generated from the same structs by `nbui gen`:
    - `fragments/<part>.html`: each part's markup, from its specimens;
    - `nb.html-data.json`: VS Code custom HTML data (elements, attributes, descriptions) for completion and hover in any HTML-like template;
    - `ui.types.js`: JSDoc `@typedef`s for the descriptions, checked in the editor with `// @ts-check`.

    Editor help only; `check.mjs` on rendered pages stays the enforcing check. No JS renderer (a second implementation) until a JS app needs it.

## Layout

```
token/token.css                         level 0
components/<part>/<part>.{css,html,js}  level 1 (html = the part's template; js only with behaviour)
blocks/<part>/…                         level 2
shell/<part>/…                          level 3: page frame, page templates
*.go                                    package ui: node.go, ctx.go, assets.go, icons_gen.go, one file per part (button.go, field.go, …)
showcase/*.go                           specimens as Go values
screens/auth/*.go                       auth's screens (place revisited later)
cmd/nbui/                               gen | copy | copy -check
fragments/, nb.html-data.json, ui.types.js   generated, committed
```

The Go package stays flat in the root (`package ui`, module `github.com/nobloat/ui`), because Go has one package per folder; templates, CSS and JS sit in the level folders and are embedded (`//go:embed token components blocks shell`).

## Interfaces

```go
type Node interface{ Render(c *Ctx, w io.Writer) error }

type Ctx struct {
    Lang string
    T    func(key string) string // the app's and ui's texts
    used map[string]bool          // parts rendered, read by Assets
}

type Text string // an i18n key
type Icon string // constants generated from icons/

// each part
type Field struct {
    Name, Value  string
    Label        Text
    Type         FieldType // Text, Password, Email, …
    Required     bool
    Autocomplete string
    Err          Text
}
func (f Field) Render(c *Ctx, w io.Writer) error // records "field", runs components/field/field.html

// a slot inside a template: {{node .Body}}
// assets for an app, called from its test
func Assets(c *Ctx) (css, js []byte)
```

```
go -C ../ui run ./cmd/nbui gen                       showcase pages, fragments, nb.html-data.json, ui.types.js
go -C ../ui run ./cmd/nbui copy -to ../<app>/ui         Go package + assets into the app, unchanged
go -C ../ui run ./cmd/nbui copy -to ../<app>/ui -check  fails if the copy differs
```

## Checks

- `go test ./...`: every part renders its specimens; generated files are current; `observedAttributes` match the `attr` tags; icons constants match `icons/`; only tokens in CSS (`TestTokensOnly`); every token pair a part uses meets its contrast in light and dark (computed from `token.css`).
- **Structure is enforced by the types, not checked afterwards:** a button without an icon, a field without a label, a page without a title or `h1`, an icon-only control without a name, a field error not linked (`aria-invalid`, `aria-describedby`), an icon not `aria-hidden`, a skipped heading level, a missing skip link or `lang`: none of these can be built. Ids come from the parts, so duplicates are a render error.
- **`check.mjs` shrinks to what needs a browser's layout:** horizontal scroll and elements outside the viewport at 320 px, one-line parts that wrap, clipped text, contrast of the computed colours (brand, app CSS), target sizes, a visible focus. App parts with their own `Render` and app CSS can still break these, so the check runs on every app's screens. It stays (open question 8: whether it moves to Go).
- Light and dark, 320 px to desktop, looked at (design-system.md → Done means checked and looked at).

## Rules that change (into design-system.md on confirmation)

- "Plain HTML, nothing to build" for the showcase pages: they are generated; edit the Go specimens and the part folders.
- "Apps copy files": apps copy the Go package and the assets with `nbui copy`; an app depends on ui's types, but still builds standalone with nothing fetched.
- Layers table: files per part in the level folders instead of `components.css`, `blocks.css`, `shell.css`.

## Phases

1. **Core** (done 2026-11-27): `Node`, `Ctx`, `Text`, icon constants (`icons_gen.go`), `Render`, `Assets` and `WriteAssets`, `nbui copy`; `token/token.css` and `token/base.css`; button, kbd, field, form and the bare page, split out of the layer files (which import them, so the showcase pages are unchanged); the specimens render to `showcase/sample/`; `TestRules` shows what cannot be built. `nbui gen` comes with phase 2, when there are pages to generate.
2. **Every released part** (done 2026-11-27; calendar week and month and the sync state stay untyped, their markup is the app's): components and blocks split out of `components.css`, `blocks.css`, `shell.css` and `components.js` into part folders, with types and specimens; the showcase pages generated; fragments, HTML data, typedefs. Today's `ui.css`, `ui.js` and `partials.html` stay for the apps until each migrates.
3. **Auth screens, all of them,** as Go values rendered to HTML: sign in, TOTP, forgot, setup, token, apps (portal), account, history, users, user, new user, roles, role, SAML, sign out, message, error. Parts they need that are not released yet go through the iteration (proposals, pick, refine, release) first, one at a time.
4. **Index:** "The system" on `index.html`, after Architecture (see below).
5. **Rollout:** apps move one at a time (auth first) with `nbui copy`; the old `ui.css`, `ui.js`, `partials.html` and the old gallery go after the last.

### The system (index.html)

- **Foundations:** storage (files, no database), outbox (what leaves the system), workq (jobs), ui, auth (basic auth for one user, or nobloat/auth). Each links to its skill or, where there is none, its repo.
- **How the UI is stitched together:** levels, parts, screens as Go values, assets from usage (this plan, short).
- **How the apps talk to each other:** service users with API keys, the URLs as configuration, webhooks and pushes through the outbox.
- **How auth is managed:** forward auth with the `Remote-*` headers, groups as the only source of access, apps in `<id>.app.conf`, users and roles in files.
- **The rest:** the other skills and components, one line each.

## Decided questions (the default was taken for each)

1. The Go package flat in the root as `package ui`, templates and assets in the level folders? [yes]
2. An app's copy goes to `<app>/ui/` and is imported as `<module>/ui`? [yes]
3. A part's template is `<level>/<part>/<part>.html` next to its CSS? [yes]
4. Parts auth needs that are not released (list, detail, form and error templates; the sign-in card; the apps grid; the TOTP QR code): through the iteration on `proposals.html` before the screens? [yes, one at a time]
5. workq is not part of this stack (no submodule): link its repo from the index? [yes]
6. Order of work: phase 1, show it, then 2; auth screens (3) after the parts they need; index (4) can run in parallel any time? [yes]
7. The rule changes above go into `design-system.md` with phase 1? [yes]
8. The browser check: keep the smaller `check.mjs` (Node, no packages), or port it to Go (`nbui check`, Chrome over the DevTools protocol with a hand-written WebSocket client of about 150 lines, since Go's standard library has none)? [keep `check.mjs` now; port when Node is the last non-Go tool in CI]
