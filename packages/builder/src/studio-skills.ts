export const STUDIO_SKILLS: Record<string, string> = {
  'pikku-prototype/SKILL.md': `---
name: pikku-prototype
description: >-
  Building a prototype of an app in Pikku Studio. The prototype is its own app in apps/<app>-prototype, next to the real one,
  with mock data. TRIGGER when: the owner asks to try a direction, sketch a screen, or see an idea before it is built for real.
---

# Prototype

A prototype is a throwaway you can click through. It lives in \`apps/<app>-prototype\`, where \`<app>\` is the folder name of the real app in \`apps/\`. One prototype per app.

1. Read the chosen direction in \`artifacts/\` and the real app's screens (read only) so the prototype looks like it belongs.
2. Create or edit only \`apps/<app>-prototype\`. Anything outside it is read-only for you.
3. Never call the real app's functions or database. Put fake data in \`apps/<app>-prototype/mocks/\` as plain typed objects and read it from there.
4. Use the same stack as the real app (Tailwind and shadcn components) so a good screen can be lifted across later.
5. Keep it small: the screens the owner asked for, not the whole product.
6. When done, say in plain words what the owner can click through and how to open it.

Do not suggest changes to the real app and do not file changes. If the owner likes the prototype, they will ask for it to be built on the Build screen.
`,
}
