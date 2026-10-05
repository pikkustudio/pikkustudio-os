import { mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import type { BuilderMode } from '@pikku/builder'

export const BUILDER_MODES: BuilderMode[] = ['build', 'prototype', 'artifacts', 'knowledge']

const SUFFIX = '-prototype'

const appFolders = (projectDir: string) => {
  try {
    return readdirSync(join(projectDir, 'apps'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.endsWith(SUFFIX))
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

export const prototypeFolders = (projectDir: string) => appFolders(projectDir).map((name) => join('apps', `${name}${SUFFIX}`))

export function modeScope(mode: BuilderMode, projectDir: string): { only?: string[]; protected?: string[] } {
  if (mode === 'artifacts') return { only: ['artifacts'] }
  if (mode === 'knowledge') return { only: ['knowledge'] }
  const prototypes = prototypeFolders(projectDir)
  if (mode === 'prototype') {
    for (const folder of prototypes) mkdirSync(join(projectDir, folder), { recursive: true })
    return { only: prototypes }
  }
  return { protected: prototypes.map((folder) => join(projectDir, folder)) }
}
