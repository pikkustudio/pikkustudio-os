import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import { headlessKey } from '../../lib/headless.js'

export const StartResult = z.object({ started: z.boolean(), reason: z.string() })

export const StartChangesInput = z.object({})

export const startChanges = pikkuSessionlessFunc({
  description: "Start working through the project's open changes.",
  input: StartChangesInput,
  output: StartResult,
  func: async ({ studio }) => {
    try {
      return await studio.builder.startChanges(headlessKey())
    } catch (error) {
      return { started: false, reason: error instanceof Error ? error.message : String(error) }
    }
  },
})

export const StartBuildInput = z.object({ model: z.string().optional(), idea: z.string().optional() })

const ideaOf = async (dir: string): Promise<string | null> => {
  try {
    const { idea } = JSON.parse(await readFile(join(dir, '.studio', 'project.json'), 'utf8'))
    return typeof idea === 'string' && idea.trim() ? idea : null
  } catch {
    return null
  }
}

export const startBuild = pikkuSessionlessFunc({
  description: "Build the project's idea for the first time.",
  input: StartBuildInput,
  output: StartResult,
  func: async ({ studio }, { model, idea: given }) => {
    try {
      const key = headlessKey()
      const state = await studio.builder.state(key)
      if (state.busy || state.items.length) return { started: false, reason: 'The project is already built or being built' }
      const idea = given?.trim() || (await ideaOf(await studio.projects.projectDir(key)))
      if (!idea) return { started: false, reason: 'The project has no idea to build from' }
      if (model) studio.models.set(key, model)
      const after = await studio.builder.prompt(key, idea)
      const failed = after.items.at(-1)
      if (failed?.kind === 'error') return { started: false, reason: failed.text }
      return { started: true, reason: 'Building from the idea' }
    } catch (error) {
      return { started: false, reason: error instanceof Error ? error.message : String(error) }
    }
  },
})
