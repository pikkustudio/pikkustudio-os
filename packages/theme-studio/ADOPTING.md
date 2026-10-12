# Adopting @pikku/theme-studio

One package holds the theme and the Customize panel for Studio and the website.

## Where things are

- `src/palettes.ts` palette ids, labels, groups, swatches, `PALETTE_KEY`, `SCHEME_KEY`, `paletteScript`. Entry format is unchanged, so `apps/website/scripts/palette-map.ts` can read this folder (`loadPalettes('<repo>/packages/theme-studio/src')`).
- `src/palettes.css` generated token blocks (`:root[data-palette='x']`, `:root.dark[data-palette='x']`).
- `src/store.ts` storage helpers, `schemeScript`, `earlyThemeScript` (scheme + palette, one string), `applyColorMode`.
- `src/registry.ts` the settings registry: `customizeSections`, `customizeItems`, `languageItem`, `CustomizeLabels`, `englishLabels`. A new setting is one `CustomizeItem` (id, section, label, control, storageKey, fallback, choices, read, write).
- `src/CustomizePanel.tsx` `CustomizeHost`: React + Tailwind classes only, no icon or UI library. Colours come from `--cz-*` CSS variables.

## Import paths

```ts
import { CustomizeHost, earlyThemeScript, englishLabels } from '@pikku/theme-studio'
import '@pikku/theme-studio/palettes.css'
```

Add `"@pikku/theme-studio": "workspace:*"` to the app, run the workspace install, and add `@source '<path>/packages/theme-studio/src';` to the Tailwind entry CSS so the panel classes are generated.

## The mount

Early, in `<head>`: `<script dangerouslySetInnerHTML={{ __html: earlyThemeScript }} />`
Around the app body, once: `<CustomizeAside>{the whole page}</CustomizeAside>`. Nothing else to mount.

`CustomizeAside` is a layout wrapper, not an overlay. It renders a full-height flex row: the page in a `min-w-0 flex-1` column that scrolls on its own, and the Customize panel as an aside beside it. Closed, the aside is 0 wide; open, it is 26rem, animated with a width transition (off under reduced motion). The page shrinks to what is left, so every layout inside reflows, including `fixed` and `absolute` chrome: the column uses `contain: layout`, so `fixed inset-0` roots and `fixed` drawers position against the column, not the viewport. The width is exposed as `--cz-aside-w` (`0px` or `26rem`) on the wrapper for anything that needs it.

Below 768px the aside is an overlay on top of the page (pushing would crush it). The entry tab sits on the right edge while closed; open, the panel header has the close button. Escape or the button closes it and focus returns to the tab.

Notes for the host page: do not give `body` its own scroll or `min-h-screen` layout assumptions; the column is the scroller (`h-dvh`). Code reading `window.scrollY` or using `window` as an observer root must use the column instead. Portalled UI (menus, dialogs) still renders on `body`, above the aside.

Props: `labels` (translated `CustomizeLabels`), `extraItems`, `shell` (replace the panel chrome, Studio passes its `SidePanel` with `inline`; the shell receives `inline: true` and must fill its parent instead of using `fixed`), `enabled={false}` renders only the children. `CustomizeHost` is still exported as the old overlay (tab plus fixed panel) for pages that cannot be wrapped.

## What the website maps

1. `--cz-surface`, `--cz-ink`, `--cz-ink-2`, `--cz-line`, `--cz-accent`, `--cz-accent-ink`, `--cz-hover`, `--cz-ring`: set these on `:root` to the website's own names (card, ink, soft, faint, cloudwash, claydeep, paper2, clay). Studio's map is `packages/pikkustudio-blocks/src/styles/customize-map.css`.
2. The palette token values: `palettes.css` sets Studio token names (`--background`, `--card`, `--primary`...). The website keeps its paper/ink/clay names through `palette-map.ts` (`mapMode`) generating its own CSS from the same `palettes.ts` and `palettes.css`. Regenerate it from this folder instead of a copy.
3. Dark mode is the `dark` class on `<html>` and the palette is `data-palette` on `<html>`.

## Storage compatibility

- Palette: `localStorage['pikku-palette']`, default `paper`.
- Colour mode: `localStorage['app-color-scheme']` = `light` or `dark`; key absent means Auto.
- Studio only: language `app-locale`, Pikku animation `pikku-blob-motion` (`on`, `off`, absent = follow system).
- Same origin or a shared parent cookie is not used, so the website and Studio on different hosts keep their own choice.
