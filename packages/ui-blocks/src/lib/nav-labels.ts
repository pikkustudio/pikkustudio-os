import { asI18n, type I18nString } from '@pikku/react'
import type { LucideIcon } from 'lucide-react'
import { m } from '@/i18n/messages'
import { navIcons } from '@/nav-icons.gen'

// The registry names messages and icons by key (src/nav.gen.json); gen-addons.mjs checks each one exists.
const messages = m as unknown as Record<string, (() => I18nString) | undefined>
export const msg = (key: string): I18nString => messages[key]?.() ?? asI18n(key)
export const navIcon = (name: string): LucideIcon => navIcons[name]!

/** A screen's agent as the chat shows it: the name, and the title and description as text (absent for a `studio:` agent). */
export type ScreenAgentLabels = { agent: string; title: I18nString | null; description: I18nString | null }
export const screenAgentLabels = (screen: { agent?: string; agentTitle?: string; agentDescription?: string }): ScreenAgentLabels | null =>
  screen.agent ? { agent: screen.agent, title: screen.agentTitle ? msg(screen.agentTitle) : null, description: screen.agentDescription ? msg(screen.agentDescription) : null } : null
