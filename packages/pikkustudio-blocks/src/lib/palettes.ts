export type Swatch = { bg: string; primary: string; hero: string }
export type PaletteInfo = { id: string; label: string; light: Swatch; dark: Swatch }
export type ColorMode = 'light' | 'dark' | 'system'

export const PALETTE_KEY = 'pikku-palette'
export const SCHEME_KEY = 'app-color-scheme'
export const DEFAULT_PALETTE = 'paper'

export const palettes: PaletteInfo[] = [
  { id: 'paper', label: 'Paper', light: { bg: '#f4ecdd', primary: '#ba3e0d', hero: '#942d03' }, dark: { bg: '#15110d', primary: '#e0a06a', hero: '#781e00' } },
  { id: 'studio', label: 'Studio teal', light: { bg: '#f6fafb', primary: '#00767e', hero: '#00717a' }, dark: { bg: '#0a1519', primary: '#2ed3c6', hero: '#00595f' } },
  { id: 'hearth', label: 'Hearth', light: { bg: '#faede5', primary: '#a94500', hero: '#8d3700' }, dark: { bg: '#1a120d', primary: '#ea9d60', hero: '#722600' } },
  { id: 'ember', label: 'Ember', light: { bg: '#f8edeb', primary: '#af2c22', hero: '#97271b' }, dark: { bg: '#1a1110', primary: '#f18a76', hero: '#7b150c' } },
  { id: 'kiln', label: 'Kiln', light: { bg: '#f4f2ee', primary: '#97400d', hero: '#942d03' }, dark: { bg: '#17130e', primary: '#e99d6e', hero: '#791c00' } },
  { id: 'sage', label: 'Sage', light: { bg: '#ebf2eb', primary: '#185b37', hero: '#23643f' }, dark: { bg: '#0f1610', primary: '#82cb92', hero: '#124f2e' } },
  { id: 'sand', label: 'Sand', light: { bg: '#f3efeb', primary: '#25211d', hero: '#37322c' }, dark: { bg: '#151311', primary: '#ebe7e1', hero: '#25211c' } },
  { id: 'dusk', label: 'Dusk', light: { bg: '#f2eef7', primary: '#9e4600', hero: '#563576' }, dark: { bg: '#140e1d', primary: '#f6ab6b', hero: '#42245e' } },
  { id: 'saffron', label: 'Saffron', light: { bg: '#f4f0e1', primary: '#8b5600', hero: '#7b4d00' }, dark: { bg: '#171309', primary: '#eebc4a', hero: '#643b00' } },
]

export const paletteScript = `try{var p=localStorage.getItem('${PALETTE_KEY}');if(p&&${JSON.stringify(palettes.map((x) => x.id))}.indexOf(p)>-1)document.documentElement.setAttribute('data-palette',p)}catch(e){}`
