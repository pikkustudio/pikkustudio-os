import { asI18nStub, type I18nString } from '@pikku/react'
import type { ProjectHome, Stage } from '../lib/projectHome'

export type HomeState = 'new' | 'local-paused' | 'local-working' | 'cloud-asleep' | 'cloud-running' | 'teammate' | 'problems' | 'offline'

export const homeStates: Array<[HomeState, I18nString]> = [
  ['new', asI18nStub('First time')],
  ['local-paused', asI18nStub('On my computer, paused')],
  ['local-working', asI18nStub('Pikku is working')],
  ['cloud-asleep', asI18nStub('Cloud, asleep')],
  ['cloud-running', asI18nStub('Cloud, awake')],
  ['teammate', asI18nStub('A teammate is in')],
  ['problems', asI18nStub('Problems')],
  ['offline', asI18nStub('Offline')],
]

const live = (over: Partial<Stage> = {}): Stage => ({ id: 'production', kind: 'live', name: 'production', state: 'live', checked: '4 minutes ago', issues: [], ...over })
const test = (over: Partial<Stage> = {}): Stage => ({ id: 'staging', kind: 'test', name: 'staging', state: 'live', checked: '4 minutes ago', issues: [], ...over })

const base: ProjectHome = { name: 'Quiet Room', look: 'garden', online: true, workspaces: [], stages: [live(), test()] }

export const projectHomes: Record<HomeState, ProjectHome> = {
  new: { ...base, stages: [] },
  'local-paused': { ...base, workspaces: [{ id: 'w1', where: 'desktop', who: asI18nStub('Yasser Fadl'), mine: true, state: 'idle', when: asI18nStub('yesterday evening') }] },
  'local-working': { ...base, workspaces: [{ id: 'w1', where: 'desktop', who: asI18nStub('Yasser Fadl'), mine: true, state: 'working', change: 'changing the opening hours on the booking page', when: asI18nStub('just now') }] },
  'cloud-asleep': { ...base, workspaces: [{ id: 'w2', where: 'cloud', who: asI18nStub('Yasser Fadl'), mine: true, state: 'asleep', when: asI18nStub('asleep since 6pm') }] },
  'cloud-running': { ...base, workspaces: [{ id: 'w2', where: 'cloud', who: asI18nStub('Yasser Fadl'), mine: true, state: 'idle', when: asI18nStub('awake for 2 hours') }] },
  teammate: { ...base, workspaces: [{ id: 'w3', where: 'cloud', who: asI18nStub('Maya Ortiz'), mine: false, state: 'working', change: 'adding a waiting list to the classes page', when: asI18nStub('started 12 minutes ago') }] },
  problems: {
    ...base,
    workspaces: [{ id: 'w2', where: 'cloud', who: asI18nStub('Yasser Fadl'), mine: true, state: 'asleep', when: asI18nStub('asleep since 6pm') }],
    stages: [
      live(),
      test({ checked: '1 minute ago', issues: [{ id: 'i1', text: 'Booking confirmations are not being sent.' }, { id: 'i2', text: 'The class list is slow to open.' }] }),
      { id: 'change-menu', kind: 'change', name: 'new menu page', state: 'building', checked: '10 minutes ago', issues: [] },
    ],
  },
  offline: { ...base, online: false },
}
