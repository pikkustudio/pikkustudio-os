import { useLocation } from '@tanstack/react-router'
import type { I18nString } from '@pikku/react'
import { registry, type NavScreen } from './nav-registry'
import { screenAgentLabels, type ScreenAgentLabels } from './nav-labels'

// The agent of the screen that is open: a definePlugin screen's `agent` (nav.gen.json carries it with agentTitle and
// agentDescription). `studio:<name>` agents are Studio's own and have no title or description.

export type ScreenAgent = { agent: string; addon: string | null; title: I18nString | null; description: I18nString | null }

const segments = (path: string) => path.split('/').filter(Boolean)

/** Whether a screen's path (`:param` segments, a trailing `*`) matches a pathname. */
export const pathMatches = (pattern: string, pathname: string): boolean => {
  const want = segments(pattern)
  const have = segments(pathname)
  const splat = want[want.length - 1] === '*'
  if (splat ? have.length < want.length - 1 : have.length !== want.length) return false
  return want.every((w, i) => w === '*' || w.startsWith(':') || w === have[i])
}

/** The most specific screen at a pathname: static segments win over `:param` over `*`. */
export const screenFor = (pathname: string, screens: readonly NavScreen[] = registry.screens): NavScreen | undefined => {
  const rank = (s: NavScreen) => segments(s.path).reduce((n, w) => n * 3 + (w === '*' ? 0 : w.startsWith(':') ? 1 : 2), 0)
  return screens.filter((s) => pathMatches(s.path, pathname)).sort((a, b) => rank(b) - rank(a))[0]
}

type Labelled = (screen: NavScreen) => ScreenAgentLabels | null
export const agentAt = (pathname: string, screens?: readonly NavScreen[], labels: Labelled = screenAgentLabels): ScreenAgent | null => {
  const screen = screenFor(pathname, screens)
  return screen ? labels(screen) : null
}

/** The agent of the open route's screen, or null when it has none. */
export const useScreenAgent = (): ScreenAgent | null => {
  const pathname = useLocation({ select: (l) => l.pathname })
  return agentAt(pathname)
}
