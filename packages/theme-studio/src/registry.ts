import { DEFAULT_PALETTE, PALETTE_KEY, SCHEME_KEY, palettes, type ColorMode } from './palettes'
import { applyColorMode, isPalette, readStored, writeStored } from './store'

export type CustomizeLabels = {
  open: string
  close: string
  title: string
  sub: string
  sectionColours: string
  sectionLanguage: string
  sectionMotion: string
  paletteLabel: string
  palettesNew: string
  modeLabel: string
  modeLight: string
  modeDark: string
  modeAuto: string
  palettes: Record<string, string>
}

export const englishLabels: CustomizeLabels = {
  open: 'Customize',
  close: 'Close',
  title: 'Customize',
  sub: 'Change how this looks on this device.',
  sectionColours: 'Colours',
  sectionLanguage: 'Language',
  sectionMotion: 'Motion',
  paletteLabel: 'Colour palette',
  palettesNew: 'New',
  modeLabel: 'Light or dark',
  modeLight: 'Light',
  modeDark: 'Dark',
  modeAuto: 'Auto',
  palettes: Object.fromEntries(palettes.map((p) => [p.id, p.label])),
}

export type CustomizeIcon = 'sun' | 'moon' | 'monitor'
export type CustomizeChoice = { id: string; label: string; icon?: CustomizeIcon }
export type CustomizeSection = { id: string; label: (l: CustomizeLabels) => string }

export type CustomizeItem = {
  id: string
  section: string
  label: (l: CustomizeLabels) => string
  control: 'palette' | 'segmented' | 'list'
  storageKey: string
  fallback: string
  choices: (l: CustomizeLabels) => CustomizeChoice[]
  read: () => string
  write: (value: string) => void
}

export const customizeSections: CustomizeSection[] = [
  { id: 'colours', label: (l) => l.sectionColours },
  { id: 'language', label: (l) => l.sectionLanguage },
  { id: 'motion', label: (l) => l.sectionMotion },
]

export const paletteItem: CustomizeItem = {
  id: 'palette',
  section: 'colours',
  label: (l) => l.paletteLabel,
  control: 'palette',
  storageKey: PALETTE_KEY,
  fallback: DEFAULT_PALETTE,
  choices: (l) => palettes.map((p) => ({ id: p.id, label: l.palettes[p.id] ?? p.label })),
  read: () => readStored(PALETTE_KEY, isPalette, DEFAULT_PALETTE),
  write: (value) => {
    document.documentElement.setAttribute('data-palette', value)
    writeStored(PALETTE_KEY, value)
  },
}

export const modeItem: CustomizeItem = {
  id: 'mode',
  section: 'colours',
  label: (l) => l.modeLabel,
  control: 'segmented',
  storageKey: SCHEME_KEY,
  fallback: 'system',
  choices: (l) => [
    { id: 'light', label: l.modeLight, icon: 'sun' },
    { id: 'dark', label: l.modeDark, icon: 'moon' },
    { id: 'system', label: l.modeAuto, icon: 'monitor' },
  ],
  read: () => readStored(SCHEME_KEY, (v) => v === 'light' || v === 'dark', 'system'),
  write: (value) => {
    writeStored(SCHEME_KEY, value === 'system' ? null : value)
    applyColorMode(value as ColorMode)
  },
}

export const customizeItems: CustomizeItem[] = [paletteItem, modeItem]

export function languageItem(
  locales: readonly string[],
  current: string,
  change: (locale: string) => void,
  storageKey: string,
  label: (l: CustomizeLabels) => string = () => 'Language',
): CustomizeItem {
  return {
    id: 'language',
    section: 'language',
    label,
    control: 'list',
    storageKey,
    fallback: current,
    choices: () =>
      locales.map((code) => {
        let name = code
        try {
          name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
        } catch {}
        return { id: code, label: name }
      }),
    read: () => current,
    write: change,
  }
}
