import { SlidersHorizontal } from 'lucide-react'
import { BLOB_MOTION_KEY, getBlobMotion, setBlobMotion, type BlobMotionPref } from '@pikku/blob-studio'
import { languageItem as sharedLanguageItem, englishLabels, type CustomizeItem, type CustomizeLabels } from '@pikku/theme-studio'
import { m } from '@/i18n/messages'

export const CUSTOMIZE_ENABLED = true

export { SlidersHorizontal }

export function studioLabels(): CustomizeLabels {
  return {
    open: m.customize__open(),
    close: m.side_panel__close(),
    title: m.customize__title(),
    sub: m.customize__sub(),
    sectionColours: m.customize__section_colours(),
    sectionLanguage: m.customize__section_language(),
    sectionMotion: m.customize__section_motion(),
    paletteLabel: m.customize__palette_label(),
    palettesNew: m.customize__palettes_new(),
    modeLabel: m.customize__mode_label(),
    modeLight: m.customize__mode_light(),
    modeDark: m.customize__mode_dark(),
    modeAuto: m.customize__mode_auto(),
    palettes: {
      ...englishLabels.palettes,
      paper: m.customize__palette_paper(),
      studio: m.customize__palette_studio(),
      hearth: m.customize__palette_hearth(),
      ember: m.customize__palette_ember(),
      kiln: m.customize__palette_kiln(),
      sage: m.customize__palette_sage(),
      sand: m.customize__palette_sand(),
      dusk: m.customize__palette_dusk(),
      saffron: m.customize__palette_saffron(),
      kitchen: m.customize__palette_kitchen(),
      linen: m.customize__palette_linen(),
      library: m.customize__palette_library(),
      shed: m.customize__palette_shed(),
      morning: m.customize__palette_morning(),
      orchard: m.customize__palette_orchard(),
    },
  }
}

export const blobMotionItem: CustomizeItem = {
  id: 'blob-motion',
  section: 'motion',
  label: () => m.customize__blob_motion_label(),
  control: 'segmented',
  storageKey: BLOB_MOTION_KEY,
  fallback: 'system',
  choices: () => [
    { id: 'system', label: m.customize__motion_system() },
    { id: 'on', label: m.customize__motion_on() },
    { id: 'off', label: m.customize__motion_off() },
  ],
  read: () => getBlobMotion(),
  write: (value) => setBlobMotion(value as BlobMotionPref),
}

export function studioLanguageItem(locales: readonly string[], current: string, change: (locale: string) => void, storageKey: string): CustomizeItem {
  return sharedLanguageItem(locales, current, change, storageKey, () => m.customize__language_label())
}
