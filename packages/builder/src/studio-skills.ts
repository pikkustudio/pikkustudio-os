const FIRST_SCREEN = `---
name: pikku-first-screen
description: Use when the owner has chosen a design direction in artifacts/<id> and you build the first screen from it: DESIGN.md, theme tokens, then the page at /.
---

This is a quick first look, so work in few steps. Never install anything (no Playwright or browsers, no global tools) and never start a dev server of your own: the project's servers are already running and the owner is watching them. Browser scenarios use the Chromium Studio already provides (PLAYWRIGHT_CHROMIUM_PATH is set in your environment; do not install one). Do not explore the project with ls, cat or --help sweeps, and do not search the filesystem for skills.

## 0. Read AGENTS.md first

Its lint rules decide how you write the page. The linter rejects arbitrary Tailwind values (text-[13px], tracking-[0.2em], w-[240px]), inline styles, raw colours and a <Button> restyled with classes. Put sizes, tracking, gradients, glows and animations in apps/app/src/styles/domain.css as @theme tokens or @utility classes, add look-alikes as <Button> variants in apps/app/src/components/ui/button.tsx, and use only theme colours. Write the page that way the first time; do not write it, fail lint and rewrite it.

## 1. DESIGN.md

Read artifacts/<id>/index.html and artifact.json, then write DESIGN.md at the project root. Use the impeccable-document skill if it is installed; if it is not, write it by hand and carry on.

## 2. Theme, before any screen

Set the colours, fonts and radius from DESIGN.md as theme tokens, and check them. Decide from DESIGN.md whether the ground is light or dark.
\`pikku theme apply --preset <name> --primary "#hex" --secondary "#hex" --accent "#hex" --page "#hex" --ink "#hex" --font-heading "<family>" --font-body "<family>"\` builds a light theme. For a dark design add \`--mode dark\` and pass the design's dark ground as --page and the text on it as --ink: every other token (card, muted, border, input, each foreground) is derived for that ground, written to :root and .dark, with a dark default colour scheme. It prints a contrast report; fix anything it flags by changing the colours you pass, and run \`pikku theme apply --help\` if unsure.
\`pikku theme apply --preset <name> --primary "#hex" --secondary "#hex" --accent "#hex" --font-heading "<family>" --font-body "<family>"\` builds a LIGHT theme. Its --page and --ink are light-mode colours, and muted text, borders and inputs are derived by darkening from the page, so a dark page gives black muted text, near-black borders and a white label on a pale primary.
For a dark design do not hand-write colours in domain.css to correct the theme, and never edit theme.css: re-run \`pikku theme apply\` with \`--mode dark\`. Also put class="dark" on <html> in apps/app/src/routes/__root.tsx.
For a dark design do not pass the dark ground as --page. Apply the preset with the brand colours and fonts, put class="dark" on <html> in apps/app/src/routes/__root.tsx, and set the design's exact ground, ink, muted, border, input and on-primary values under .dark in apps/app/src/styles/domain.css. Never edit theme.css.

Then read packages/theme/theme.css and fix any pair under 4.5:1 for text (3:1 for borders and inputs): body, muted text, the label on primary/secondary/accent, links. A token at lightness 0.000 or 1.000 was derived wrongly.

An error about emails/theme.json (EPERM) is harmless: the emails agent is rewriting that file at the same time and it is not yours.

## 3. The home screen

The starter sends / to /app, so build the home screen at /app and leave that redirect alone. Rename the product first: set app__name in the app's messages and the name in apps/app/src/app-meta.ts to the app's name from knowledge/index.md (or the direction's title), so the topbar and emails stop saying "Pikku Studio Starter".

Build it in apps/app from the direction, from the app's own components, with every string through m.*() and no copied HTML. Put sample data behind one stub hook per function with ONE healthy mock each in .mocks/ (no empty or error variants yet), declare the feature flag it needs, and register the mocks once in __root.tsx with registerPikkuMocks().
Never build a query input from something that changes on every render (new Date(), Math.random(), an object made inline): it is a new query key each time, so the page refetches and re-renders without end and floods the server. Take the value once with useState(() => ...) or useMemo, and keep the input stable.

## Mock format (everything you need; do not look inside node_modules or dist)

Add each mock with \`pikku mocks add <rpc> --state healthy --label "..." --description "..." --default --flag <flag> --body '<json>'\` (or \`--from file.json\`). Other states: \`--state empty\`, or \`--state error --status 500\`. It checks the RPC and the body against the function output, keeps exactly one default, declares the flag in packages/functions/src/flags.ts and prints the stub hook to use: \`usePikkuQueryStub('classes:month', { featureFlag: '<flag>' })\` (mutations: \`usePikkuMutationStub\`). The generated files update on their own while \`pikku dev\` runs. If something is not covered here or in AGENTS.md, run the command with --help; never read package source or write mock files by hand.

## 4. Checks, once

A \`pikku dev\` watcher is already running in the project and regenerates the .pikku files whenever you save, so do not run \`pikku all\` or \`pikku bootstrap\`: they fight it over the generated files and fail on writes. Run the checks in AGENTS.md once (\`bun run lint\` and \`bun run tsc\` in apps/app, and \`pikku validate\`, which only reads) and fix what they report; an unflagged stub is expected. If a command fails writing a file you did not create, say so in your last message and move on; do not try to work around it.

End your last message by asking the owner, in one short question, whether to create more screens, and name the two or three screens this app most likely needs next.
`

export const STUDIO_SKILLS: Record<string, string> = {
  'pikku-first-screen/SKILL.md': FIRST_SCREEN,
}
