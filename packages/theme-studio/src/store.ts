import { SCHEME_KEY, palettes, paletteScript, type ColorMode } from './palettes'


export const schemeScript = `try{var s=localStorage.getItem('${SCHEME_KEY}');if(s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`

export const earlyThemeScript = `${schemeScript};${paletteScript}`

const listeners = new Set<() => void>()

export function subscribeCustomize(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifyCustomize() {
  listeners.forEach((fn) => fn())
}

export function readStored(key: string, valid: (value: string) => boolean, fallback: string): string {
  try {
    const saved = localStorage.getItem(key)
    if (saved && valid(saved)) return saved
  } catch {}
  return fallback
}

export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

export function applyColorMode(mode: ColorMode) {
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export const isPalette = (value: string) => palettes.some((p) => p.id === value)
