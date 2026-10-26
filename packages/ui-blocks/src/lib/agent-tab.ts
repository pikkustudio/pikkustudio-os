import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { ScreenAgent } from './screen-agent'

// The chat panel's second tab: the agent of the open screen, when it has one. Everything here is a pure function of the
// screen's agent, so the tab logic is tested without the shell.

export type ChatTab = 'chat' | 'agent'

export type AgentTab = {
  /** What the server is asked for: `studio:<name>` (that specialist's own session) or `<addon>:<name>` (the addon's agent). */
  ref: string
  title: I18nString
  description: I18nString | null
}

/** Studio's own agents as the chat names them; a `studio:` name not listed here has no tab. */
export const STUDIO_AGENT_LABELS: Record<string, { title: () => I18nString; description: () => I18nString }> = {
  build: { title: () => m.screen_names__agent_build(), description: () => m.screen_names__agent_build_description() },
  frontend: { title: () => m.screen_names__agent_frontend(), description: () => m.screen_names__agent_frontend_description() },
  artifacts: { title: () => m.screen_names__agent_artifacts(), description: () => m.screen_names__agent_artifacts_description() },
  knowledge: { title: () => m.screen_names__agent_knowledge(), description: () => m.screen_names__agent_knowledge_description() },
  emails: { title: () => m.screen_names__agent_emails(), description: () => m.screen_names__agent_emails_description() },
  project: { title: () => m.screen_names__agent_project(), description: () => m.screen_names__agent_project_description() },
}

const NAME = /^[a-z][a-z0-9-]*$/

/** The reference the server takes for a screen's agent: `studio:<name>` as written, a bare name qualified by the screen's addon. */
export const agentRef = (agent: string, addon: string | null): string | null => {
  if (agent.startsWith('studio:')) return NAME.test(agent.slice(7)) ? agent : null
  return addon && NAME.test(addon) && NAME.test(agent) ? `${addon}:${agent}` : null
}

export const agentTabFor = (screen: ScreenAgent | null, studio = STUDIO_AGENT_LABELS): AgentTab | null => {
  if (!screen) return null
  const ref = agentRef(screen.agent, screen.addon)
  if (!ref) return null
  if (ref.startsWith('studio:')) {
    const known = studio[ref.slice(7)]
    return known ? { ref, title: known.title(), description: known.description() } : null
  }
  return screen.title ? { ref, title: screen.title, description: screen.description } : null
}

/** The tab to show: the agent's only while the open screen has one, otherwise the general Chat. */
export const resolveChatTab = (selected: ChatTab, hasAgent: boolean): ChatTab => (selected === 'agent' && hasAgent ? 'agent' : 'chat')
