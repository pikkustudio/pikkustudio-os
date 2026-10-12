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
In the body, once: `<CustomizeHost />`

Optional props: `labels` (translated `CustomizeLabels`), `extraItems`, `shell` (replace the default right-hand panel, Studio passes its `SidePanel`), `enabled={false}` to switch it off, `tabClassName`.

## What the website maps

1. `--cz-surface`, `--cz-ink`, `--cz-ink-2`, `--cz-line`, `--cz-accent`, `--cz-accent-ink`, `--cz-hover`, `--cz-ring`: set these on `:root` to the website's own names (card, ink, soft, faint, cloudwash, claydeep, paper2, clay). Studio's map is `packages/pikkustudio-blocks/src/styles/customize-map.css`.
2. The palette token values: `palettes.css` sets Studio token names (`--background`, `--card`, `--primary`...). The website keeps its paper/ink/clay names through `palette-map.ts` (`mapMode`) generating its own CSS from the same `palettes.ts` and `palettes.css`. Regenerate it from this folder instead of a copy.
3. Dark mode is the `dark` class on `<html>` and the palette is `data-palette` on `<html>`.

## Storage compatibility

- Palette: `localStorage['pikku-palette']`, default `paper`.
- Colour mode: `localStorage['app-color-scheme']` = `light` or `dark`; key absent means Auto.
- Studio only: language `app-locale`, Pikku animation `pikku-blob-motion` (`on`, `off`, absent = follow system).
- Same origin or a shared parent cookie is not used, so the website and Studio on different hosts keep their own choice.
