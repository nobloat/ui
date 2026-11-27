# Agents

Follow the nobloat skills ([nobloat/skill](https://github.com/nobloat/skill), checked out next to this repo as `../skill`):

- `nobloat`: stack, code, HTTP, config, tests, UI and the plan-first workflow. Always.
- Rules: [`skill/design-system.md`](skill/design-system.md) is the only source of every design and UX rule, with "Keeping it in sync" (what else a change touches), the to-do list and the Rollout differences. Read it before any UI or design system work.
- `nobloat-ui`: [`skill/SKILL.md`](skill/SKILL.md), how an app uses ui (markup, classes, ui.js); it links to the rules and never restates them. Keep it in sync with `ui.css`, `ui.js` and `partials.html`.

Every app copies `ui.css`, `ui.js`, `partials.html` and `i18n/ui/*.json` unchanged (`make ui` in the app). A change here is rolled out by running `make ui` in each app in nobloat/system and checking the screenshots there.

Agents without skill support: read `../skill/<name>/SKILL.md` and `skill/SKILL.md` here.

## Workflow

Every change follows `nobloat` → "Change an existing project" (`../skill/nobloat/SKILL.md`):

1. The prompt (appended to `PROMPT.md` with the date).
2. Adapt or create `PLAN.md`, then `README.md`, then `wireframes.html`, each as if the change were already built.
3. Adapt or create the sample configs and seeds (`examples/`, `pages/`) to the new spec.
4. Clarify open topics: one numbered list, a recommended default per item.
5. Suggest the code layout and any interfaces (files, signatures, request and response types between services).
6. Wait for the owner's confirmation, then implement in one pass.
7. Automated tests, then end to end in the whole stack: [nobloat/system](https://github.com/nobloat/system) (`make local-source` or `make local-images`, then `make local-check`; from a sibling checkout `make local-source SRC=..`).
8. Adapt CI (`.github/workflows/ci.yml`) until it is green, push to `main`. Releases: `make release APP=<this repo>` in nobloat/system.

This repo is a submodule of nobloat/system, which checks out every component side by side; changes spanning several components are driven from there.
