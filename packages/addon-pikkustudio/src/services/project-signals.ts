import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { slotKey, type BuilderSession } from '@pikkustudio/builder'
import { listArtifacts } from './artifacts.js'
import { latestActivity, type RunState, type Signals } from '../lib/project-checklist.js'
import type { StudioProjectsService } from './projects.js'
import type { StudioPublisher } from './publish.js'

const WORKING = 6

export async function readSignals(
  services: { projects: StudioProjectsService; builder: BuilderSession; publisher: StudioPublisher },
  key: string,
  run: RunState,
  now = Date.now(),
): Promise<Signals | null> {
  const intake = await services.projects.intake(key)
  if (!intake) return null
  const cwd = await services.projects.projectDir(key)
  const artifacts = (await listArtifacts(cwd)).filter((a) => a.exploration === 'first')
  const mocks = join(cwd, '.mocks')
  const front = await services.builder.state(slotKey(key, 'frontend'))
  const build = await services.builder.state(slotKey(key))
  const doing = front.busy ? front : build.busy ? build : null
  const tools = (doing?.items ?? [])
    .slice(-40)
    .flatMap((item) => (item.kind === 'tool' ? [{ summary: item.summary, at: item.at }] : []))
    .slice(-WORKING * 4)
  return {
    intake,
    directions: { total: artifacts.length, chosen: artifacts.some((a) => a.chosen), chosenId: artifacts.find((a) => a.chosen)?.id },
    designed: existsSync(join(cwd, 'DESIGN.md')),
    samples: existsSync(mocks) ? readdirSync(mocks).filter((n) => !n.startsWith('.')).length : 0,
    busy: { frontend: front.busy, build: build.busy },
    publish: (() => {
      const job = services.publisher.status(key)
      return { state: job.state }
    })(),
    run,
    activity: doing ? latestActivity(tools) : null,
    now,
  }
}
