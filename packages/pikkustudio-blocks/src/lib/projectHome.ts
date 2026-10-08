import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { ProjectLook } from '../blocks/ProjectThumb'

export type Way = 'local' | 'cloud' | 'look'

export type StageState = 'live' | 'building' | 'off'

export type StageIssue = { id: string; text: string }

export type Stage = {
  id: string
  kind: 'live' | 'test' | 'change'
  name: string
  state: StageState
  checked: string
  issues: StageIssue[]
}

export type Workspace = {
  id: string
  where: 'desktop' | 'cloud'
  who: I18nString
  mine: boolean
  state: 'working' | 'idle' | 'asleep'
  change?: string
  when: I18nString
}

export type ProjectHome = {
  name: string
  look: ProjectLook
  online: boolean
  workspaces: Workspace[]
  stages: Stage[]
}

export type Plan = {
  way: Way
  title: I18nString
  why: I18nString
  action: I18nString
  hint?: I18nString
  disabled?: boolean
  art: 'laptop' | 'cloud' | 'window'
  hue: 'teal' | 'petrol' | 'sea'
  others: Way[]
  mineLocal?: Workspace
  mineCloud?: Workspace
  theirCloud?: Workspace
  problems: Stage[]
  calm: Stage[]
}

const first = (who: string) => who.split(' ')[0]

/** The stage's name as a phrase. `inline` is the form used mid-sentence ("the live site"). */
export const stageLabel = (s: Stage, inline = false): I18nString =>
  s.kind === 'live'
    ? inline ? m.project_home__stage_live_inline() : m.project_home__stage_live()
    : s.kind === 'test'
      ? inline ? m.project_home__stage_test_inline() : m.project_home__stage_test()
      : m.project_home__stage_change({ name: s.name })

export function planFor(p: ProjectHome): Plan {
  const mineLocal = p.workspaces.find((w) => w.mine && w.where === 'desktop')
  const mineCloud = p.workspaces.find((w) => w.mine && w.where === 'cloud')
  const theirCloud = p.workspaces.find((w) => !w.mine && w.where === 'cloud')
  const problems = p.stages.filter((s) => s.issues.length > 0)
  const calm = p.stages.filter((s) => s.issues.length === 0)
  const base = { mineLocal, mineCloud, theirCloud, problems, calm }
  const rest = (way: Way): Way[] => (['cloud', 'local', 'look'] as Way[]).filter((w) => w !== way)

  if (mineLocal && mineLocal.state === 'working') {
    return { ...base, way: 'local', art: 'laptop', hue: 'teal', others: rest('local'), title: m.project_home__local_working_title(), why: mineLocal.change ? m.project_home__local_working_why_change({ change: mineLocal.change }) : m.project_home__local_working_why(), action: m.project_home__local_working_action(), hint: m.project_home__local_working_hint() }
  }
  if (mineLocal) {
    return { ...base, way: 'local', art: 'laptop', hue: 'teal', others: rest('local'), title: m.project_home__local_paused_title(), why: m.project_home__local_paused_why({ when: mineLocal.when }), action: m.project_home__local_paused_action(), hint: m.project_home__local_paused_hint() }
  }
  if (mineCloud && mineCloud.state === 'asleep') {
    return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: m.project_home__cloud_asleep_title(), why: m.project_home__cloud_asleep_why(), action: m.project_home__cloud_asleep_action(), hint: p.online ? undefined : m.project_home__cloud_asleep_hint(), disabled: !p.online }
  }
  if (mineCloud) {
    return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: m.project_home__cloud_awake_title(), why: m.project_home__cloud_awake_why(), action: m.project_home__cloud_awake_action(), disabled: !p.online }
  }
  if (theirCloud && p.online) {
    const name = first(theirCloud.who)
    return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: m.project_home__cloud_theirs_title({ name }), why: theirCloud.change ? m.project_home__cloud_theirs_why_change({ name, change: theirCloud.change }) : m.project_home__cloud_theirs_why({ name }), action: m.project_home__cloud_theirs_action({ name }), hint: m.project_home__cloud_theirs_hint() }
  }
  if (!p.online) {
    return { ...base, way: 'local', art: 'laptop', hue: 'teal', others: [], title: m.project_home__offline_title(), why: m.project_home__offline_why(), action: m.project_home__offline_action(), hint: m.project_home__offline_hint() }
  }
  return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: m.project_home__start_title(), why: m.project_home__start_why(), action: m.project_home__start_action(), hint: m.project_home__start_hint() }
}
