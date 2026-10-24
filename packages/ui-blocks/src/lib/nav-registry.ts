import nav from '@/nav.gen.json'
import { STUDIO_LOCAL } from '@/lib/env'

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
  local: readonly string[]
  pins: readonly NavPin[]
  quickFind: readonly NavLink[]
  explore: readonly ExploreSection[]
}

const firstOf = (path: string) => path.split('/').filter(Boolean)[0] ?? ''

const LOCAL = new Set((nav as unknown as NavRegistry).local)
/** A page only Studio on this computer serves (core-screens.ts `local`); always false outside the web build. */
export const isLocalOnly = (path: string) => !STUDIO_LOCAL && LOCAL.has(firstOf(path))

// The web build lists no local-only page. `screens` keeps them all: which segment is a team or project page is how a
// URL is read, so the routes can still turn one of their URLs away.
const raw = nav as unknown as NavRegistry
const listed = <T extends { path: string }>(rows: readonly T[]) => rows.filter((r) => !isLocalOnly(r.path))
export const registry: NavRegistry = {
  ...raw,
  pins: listed(raw.pins),
  quickFind: listed(raw.quickFind),
  explore: raw.explore.map((x) => ({ ...x, rows: listed(x.rows) })),
}

const norm = (path: string) => '/' + path.split('/').filter(Boolean).join('/')
/** The screen registered at a path (core's or the addon's that replaced it). */
export const screenAt = (path: string): NavScreen | undefined => registry.screens.find((s) => norm(s.path) === norm(path))

/** The screens with a nav entry in an area, in their order (core first on a tie). */
export const navEntries = (area: NavArea): NavScreen[] =>
  registry.screens.filter((s) => s.nav?.area === area && !s.path.includes(':') && !isLocalOnly(s.path)).sort((a, b) => a.nav!.order - b.nav!.order)

/** First path segments by scope; a project page's value says whether it reads the project's running app. */
export const GLOBAL = new Set([...registry.unscoped, ...registry.screens.filter((s) => s.scope === 'studio').map((s) => firstOf(s.path))])
export const TEAM_PAGES = new Set(registry.screens.filter((s) => s.scope === 'team').map((s) => firstOf(s.path)))
export const PAGES: Record<string, boolean> = {}
for (const s of registry.screens) if (s.scope === 'project' && !Object.hasOwn(PAGES, firstOf(s.path))) PAGES[firstOf(s.path)] = !!s.needsApp
/** Pages whose id is the rest of the path (/code/<file path>). */
export const SPLAT = new Set(registry.screens.filter((s) => s.path.endsWith('/*')).map((s) => firstOf(s.path)))
