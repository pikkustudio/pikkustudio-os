import type { ProjectHome, Stage } from '../lib/projectHome'

export type HomeState = 'new' | 'local-paused' | 'local-working' | 'cloud-asleep' | 'cloud-running' | 'teammate' | 'problems' | 'offline'

export const homeStates: Array<[HomeState, string]> = [
  ['new', 'First time'],
  ['local-paused', 'On my computer, paused'],
  ['local-working', 'Pikku is working'],
  ['cloud-asleep', 'Cloud, asleep'],
  ['cloud-running', 'Cloud, awake'],
  ['teammate', 'A teammate is in'],
  ['problems', 'Problems'],
  ['offline', 'Offline'],
]

const live = (over: Partial<Stage> = {}): Stage => ({ id: 'production', kind: 'live', name: 'production', state: 'live', checked: '4 minutes ago', issues: [], ...over })
const test = (over: Partial<Stage> = {}): Stage => ({ id: 'staging', kind: 'test', name: 'staging', state: 'live', checked: '4 minutes ago', issues: [], ...over })

const base: ProjectHome = { name: 'Quiet Room', look: 'garden', online: true, workspaces: [], stages: [live(), test()] }

export const projectHomes: Record<HomeState, ProjectHome> = {
  new: { ...base, stages: [] },
  'local-paused': { ...base, workspaces: [{ id: 'w1', where: 'desktop', who: 'Yasser Fadl', mine: true, state: 'idle', when: 'yesterday evening' }] },
  'local-working': { ...base, workspaces: [{ id: 'w1', where: 'desktop', who: 'Yasser Fadl', mine: true, state: 'working', change: 'changing the opening hours on the booking page', when: 'just now' }] },
  'cloud-asleep': { ...base, workspaces: [{ id: 'w2', where: 'cloud', who: 'Yasser Fadl', mine: true, state: 'asleep', when: 'asleep since 6pm' }] },
  'cloud-running': { ...base, workspaces: [{ id: 'w2', where: 'cloud', who: 'Yasser Fadl', mine: true, state: 'idle', when: 'awake for 2 hours' }] },
  teammate: { ...base, workspaces: [{ id: 'w3', where: 'cloud', who: 'Maya Ortiz', mine: false, state: 'working', change: 'adding a waiting list to the classes page', when: 'started 12 minutes ago' }] },
  problems: {
    ...base,
    workspaces: [{ id: 'w2', where: 'cloud', who: 'Yasser Fadl', mine: true, state: 'asleep', when: 'asleep since 6pm' }],
    stages: [
      live(),
      test({ checked: '1 minute ago', issues: [{ id: 'i1', text: 'Booking confirmations are not being sent.' }, { id: 'i2', text: 'The class list is slow to open.' }] }),
      { id: 'change-menu', kind: 'change', name: 'new menu page', state: 'building', checked: '10 minutes ago', issues: [] },
    ],
  },
  offline: { ...base, online: false },
}
