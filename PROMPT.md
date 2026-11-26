# Prompts

## 2026-11-25 — shortcut hints, icons on every button, dice, `?` by context

the noel ui skill requires indicators on buttons that are triggerable via shortcuts right? ? for all available shortcuts is fine, but call has no command palette nor tab/page or filter chips?

first of all why are kbd hidden? (Hidden since 2026-11-24, `e5eca70`, a default of jot's strip-down proposal applied to every app.)

yes show hints on buttons again (desktop only)
also enforce that each action button has an appropriate icon
since we now have a dice icon use that anywhere where we genarate random names/ids (jot comes to mind)

? should only show valid shortcuts in the current context/view not just show all. specifically if there is no command bar pages to navigate etc.

links indicate via the g + whatever letter right? · we simply dont have [a command palette] in call · [icons:] no exceptions

make sure all app are then updated, let me know if we are missing icons

(Decided: `<kbd>` shows on desktop in buttons, `.btn` and nav links (`g d`); phones hide every hint; round icon-only buttons keep the key in their tooltip. ui.js adds the `<kbd>` from `data-key` where the markup has none. Every button and `.btn` has an icon, no exceptions; `check.mjs` fails one without. The dice is for random names and ids, `refresh` for reload and retry. `?` hides a row whose `data-needs` selector matches nothing visible; an app turns the palette off with `<body data-nopalette>` (call). Every app gets the new copy and is released.)

---

## 2026-11-25 — error page templates

fix these issues and let's define templates in ui for typical error pages, show me your designs on chrome · can you add some appropriate visuals? · i think B works better · make them generic for all apps, not specific ones · a dot display with the error code would be cool i guess, something that looks elegant but still a touch of geek · also maybe browse https://404s.design/ what would fit? · make sure the dot display works on light and dark · [display and drawing:] 2 · fit all in a single wireframe-errors.html, with a way to tweak the primary color · i like it commit it and introduce in all projects

(Decided: `nb-error` with `.Error` for 400 401 403 404 409 410 413 429 500 503; a 5×7 dot-matrix display of the code (generated in ui_test.go) above a line drawing of the mark ][◆ per code; the display follows light and dark, its dots and the drawing's highlights in the primary color; `wireframe-errors.html` embeds the example pages with design, theme and primary color to switch.)

---

## 2026-11-26 — rules for the Penpot design system

no copies! inacceptable · all should stack on each layer · i want to build a reusable, sustainable design system to quickly develop new app in nobloat style also from UX and UI perspective · content slots are very important · not all apps, let's start with the simplest one (auth, call) · are we missing guidelines / agents.md for the ui/ux design with penpot? you made quite a lot of mistakes and ignored clear orders, let's fix that first

(Decided: `skill/penpot.md` holds the rules for Penpot work: layers built only from instances of the layer below, containers with content slots, one layer at a time and screens last, app by app; the hard ground rules; what "done" means; the plugin pitfalls. Linked from `AGENTS.md` and `skill/SKILL.md`.)

what is this generator? · is there a benefit doing this in node/js? · alright, then lets commit that

(Decided: the Penpot screen generator lives in `penpot/` (renderer `lib.js` for the plugin, screen definitions `apps/*.json`, `validate.mjs`, `dryrun.mjs`, `serve.mjs`). The renderer stays JS because the Penpot plugin API is JS; the definitions are a one-time migration snapshot, not a second source of truth. Icon names are read from `icons/`, not a copied list.)

---

## 2026-11-26 — penpot.md as the future source of truth

lets review the penpot skill, is it in accordance what is defined in the UI/UX requirements of the ui module? · penpot will supersede the manual defined rules but we are still building this now. so we are just building the penpot stack now, skill/readme will remain source of truth until we are done · the rules skill carries but penpot doesnt need to be ported over to penpot, they are important · document the missing components as todo list etc. we can do this step by step · fix the penpot.md so this becomes the source of truth for future development

(Decided: `SKILL.md`, `README.md` and `ui.css` stay the source of truth until the design system is complete, then `skill/penpot.md` and the Penpot file replace them. Every rule of `SKILL.md` that concerns look and UX is carried into `penpot.md` (brand, contrast details, target size and focus, widths and phone structure, icons and their meanings, buttons and key hints, page anatomy, forms, errors, data display, charts). The owner's earlier Penpot decisions (one design, no uppercase headings, hover, call look) are listed as decided differences that go into `ui.css` at the handover. Missing components and templates are a to-do list per layer.)
