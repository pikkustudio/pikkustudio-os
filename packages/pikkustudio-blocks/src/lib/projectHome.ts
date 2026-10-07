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
  who: string
  mine: boolean
  state: 'working' | 'idle' | 'asleep'
  change?: string
  when: string
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
  title: string
  why: string
  action: string
  hint?: string
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

export const stageLabel = (s: Stage) => (s.kind === 'live' ? 'The live site' : s.kind === 'test' ? 'The practice copy' : `Copy for “${s.name}”`)

export function planFor(p: ProjectHome): Plan {
  const mineLocal = p.workspaces.find((w) => w.mine && w.where === 'desktop')
  const mineCloud = p.workspaces.find((w) => w.mine && w.where === 'cloud')
  const theirCloud = p.workspaces.find((w) => !w.mine && w.where === 'cloud')
  const problems = p.stages.filter((s) => s.issues.length > 0)
  const calm = p.stages.filter((s) => s.issues.length === 0)
  const base = { mineLocal, mineCloud, theirCloud, problems, calm }
  const rest = (way: Way): Way[] => (['cloud', 'local', 'look'] as Way[]).filter((w) => w !== way)

  if (mineLocal && mineLocal.state === 'working') {
    return { ...base, way: 'local', art: 'laptop', hue: 'teal', others: rest('local'), title: 'Pikku is working on your computer.', why: mineLocal.change ? `It is ${mineLocal.change}. You can watch it happen, or step in whenever you like.` : 'You can watch it happen, or step in whenever you like.', action: 'Go back to it', hint: 'Nothing is lost if you close it.' }
  }
  if (mineLocal) {
    return { ...base, way: 'local', art: 'laptop', hue: 'teal', others: rest('local'), title: 'Carry on where you stopped.', why: `Your copy is on this computer, paused, exactly as you left it ${mineLocal.when}.`, action: 'Carry on', hint: 'Opens straight away.' }
  }
  if (mineCloud && mineCloud.state === 'asleep') {
    return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: 'Your cloud workspace is asleep.', why: 'It went to sleep when you stopped, so it costs nothing while you are away. Waking it takes about half a minute and everything is just as you left it.', action: 'Wake it up and carry on', hint: p.online ? undefined : 'Needs the internet.', disabled: !p.online }
  }
  if (mineCloud) {
    return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: 'Carry on in the cloud.', why: 'Your workspace is awake and waiting. Your team can see what you are doing there.', action: 'Carry on', disabled: !p.online }
  }
  if (theirCloud && p.online) {
    const n = first(theirCloud.who)
    return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: `${n} is working in the cloud right now.`, why: theirCloud.change ? `${n} is ${theirCloud.change}. You can join them and watch it happen, with nothing to set up.` : `You can join ${n} and watch it happen, with nothing to set up.`, action: `Join ${n}`, hint: 'You will both see the same thing.' }
  }
  if (!p.online) {
    return { ...base, way: 'local', art: 'laptop', hue: 'teal', others: [], title: 'You are offline right now.', why: 'The first time you open a project, it has to come over the internet. Once you are back online, I will get it ready for you.', action: 'Try again', hint: 'Anything already on this computer still works.' }
  }
  return { ...base, way: 'cloud', art: 'cloud', hue: 'petrol', others: rest('cloud'), title: 'Start in the cloud.', why: 'It is the easy way in. There is nothing to install, it is ready in about a minute, and your team can see it too. You can bring it to your computer later.', action: 'Start in the cloud', hint: 'Takes about a minute.' }
}
