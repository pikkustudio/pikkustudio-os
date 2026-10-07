import type { WorkMode } from './builder-chat'

export const SCREEN_NAME: Record<WorkMode, string> = {
  build: 'Build',
  frontend: 'Design',
  artifacts: 'Artifacts',
  knowledge: 'Knowledge',
  emails: 'Emails',
}

export const agentName = (mode: WorkMode) => `Pikku ${SCREEN_NAME[mode].replace(/s$/, '')} agent`
