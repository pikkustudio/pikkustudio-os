import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import type { BuilderMode } from '@pikkustudio/builder'

export const BUILDER_MODES: BuilderMode[] = ['build', 'frontend', 'artifacts', 'knowledge', 'emails', 'project']

export function modeScope(mode: BuilderMode, projectDir?: string): { only?: string[]; protected?: string[] } {
  if (mode === 'frontend') {
    if (projectDir) mkdirSync(join(projectDir, '.mocks'), { recursive: true })
    return { only: ['apps', '.mocks', 'DESIGN.md', '.pikku', 'packages/functions-sdk', 'packages/theme', 'packages/functions/src/flags.ts', 'packages/functions/.pikku', 'emails/theme.json'] }
  }
  if (mode === 'artifacts') return { only: ['artifacts'] }
  if (mode === 'knowledge' || mode === 'project') return { only: ['knowledge'] }
  if (mode === 'emails') return { only: ['emails'] }
  return {}
}
