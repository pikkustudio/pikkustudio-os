import nav from '@/nav.gen.json'

// The nav registry scripts/gen-addons.mjs writes (src/nav.gen.json in the app): core's screens and every wired
// addon's, plus core's pins, QuickFind and Explore lists. Plain data; nav-labels.ts turns its keys into text and icons.

export type NavArea = 'rail' | 'team' | 'project' | 'account'
export type Scope = 'studio' | 'team' | 'project'
export type NavScreen = {
  path: string
  title: string
  scope: Scope
  nav?: { area: NavArea; icon: string; order: number; badge?: string; when?: 'journey' }
  needsApp?: boolean
  layout?: 'bare'
  scopes?: readonly string[]
  replaces?: boolean
  addon: string | null
}
export type NavPin = { path: string; label: string; icon: string; on: boolean }
export type NavLink = { path: string; label: string; icon: string }
export type ExploreRow = { path: string; title: string; text: string; hue: 'teal' | 'petrol' | 'sea'; icon: string }
export type ExploreSection = { title: string; rows: readonly ExploreRow[] }
export type NavRegistry = {
  screens: readonly NavScreen[]
  unscoped: readonly string[]
  pins: readonly NavPin[]
  quickFind: readonly NavLink[]
  explore: readonly ExploreSection[]
}

export const registry = nav as unknown as NavRegistry

const firstOf = (path: string) => path.split('/').filter(Boolean)[0] ?? ''

/** The screens with a nav entry in an area, in their order (core first on a tie). */
export const navEntries = (area: NavArea): NavScreen[] =>
  registry.screens.filter((s) => s.nav?.area === area && !s.path.includes(':')).sort((a, b) => a.nav!.order - b.nav!.order)

/** First path segments by scope; a project page's value says whether it reads the project's running app. */
export const GLOBAL = new Set([...registry.unscoped, ...registry.screens.filter((s) => s.scope === 'studio').map((s) => firstOf(s.path))])
export const TEAM_PAGES = new Set(registry.screens.filter((s) => s.scope === 'team').map((s) => firstOf(s.path)))
export const PAGES: Record<string, boolean> = {}
for (const s of registry.screens) if (s.scope === 'project' && !Object.hasOwn(PAGES, firstOf(s.path))) PAGES[firstOf(s.path)] = !!s.needsApp
/** Pages whose id is the rest of the path (/code/<file path>). */
export const SPLAT = new Set(registry.screens.filter((s) => s.path.endsWith('/*')).map((s) => firstOf(s.path)))
