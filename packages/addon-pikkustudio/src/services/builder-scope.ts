import type { BuilderMode } from '@pikku/builder'

export const BUILDER_MODES: BuilderMode[] = ['build', 'artifacts', 'knowledge', 'emails']

export function modeScope(mode: BuilderMode): { only?: string[]; protected?: string[] } {
  if (mode === 'artifacts') return { only: ['artifacts'] }
  if (mode === 'knowledge') return { only: ['knowledge'] }
  if (mode === 'emails') return { only: ['emails'] }
  return {}
}
