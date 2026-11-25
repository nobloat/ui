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
