import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { WorkMode } from './builder-chat'

export const SCREEN_NAME: Record<WorkMode, () => I18nString> = {
  build: m.screen_names__build,
  frontend: m.screen_names__frontend,
  artifacts: m.screen_names__artifacts,
  knowledge: m.screen_names__knowledge,
  emails: m.screen_names__emails,
}

const AGENT: Record<WorkMode, () => I18nString> = {
  build: m.screen_names__agent_build,
  frontend: m.screen_names__agent_frontend,
  artifacts: m.screen_names__agent_artifacts,
  knowledge: m.screen_names__agent_knowledge,
  emails: m.screen_names__agent_emails,
}

export const agentName = (mode: WorkMode): I18nString => AGENT[mode]()
