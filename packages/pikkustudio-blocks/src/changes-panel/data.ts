import { m } from '@/i18n/messages'
import type { I18nString } from '@pikku/react'

export type State = 'needs' | 'working' | 'waiting' | 'done' | 'aside'

const LABEL: Record<State, () => I18nString> = {
  needs: m.changes_data__state_needs,
  working: m.changes_data__state_working,
  waiting: m.changes_data__state_waiting,
  done: m.changes_data__state_done,
  aside: m.changes_data__state_aside,
}

export const labelOf = (s: State): I18nString => LABEL[s]()
