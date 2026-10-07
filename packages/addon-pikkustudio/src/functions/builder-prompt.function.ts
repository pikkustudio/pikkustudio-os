import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { listArtifacts } from '../services/artifacts.js'

const DIRECTIONS = 4
const DRAFT_TIMEOUT_MS = 15 * 60_000
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const BuilderPromptInput = z.object({ key: z.string(), message: z.string(), context: z.string().optional(), failOnError: z.boolean().optional(), explore: z.boolean().optional(), mode: z.enum(['build', 'frontend', 'artifacts', 'knowledge', 'emails']).optional(), offer: z.boolean().optional() })

export const builderPrompt = pikkuSessionlessFunc({
  expose: true,
  description: 'Ask the builder to do something in a project.',
  input: BuilderPromptInput,
  func: async ({ studioBuilder, studioSettings, studioProjects }, { key, message, context, failOnError, explore, mode, offer }) => {
    const { name, about } = await studioSettings.read()
    const profile = name
      ? `The person you are working with is called ${name}. Address them by that name.${about ? ` About them: ${about}. Tailor your answers to that.` : ''}`
      : undefined
    if (explore) {
      await studioBuilder.directions(key, message, DIRECTIONS, context)
      return studioBuilder.state(key)
    }
    const state = await studioBuilder.prompt(key, message, [profile, context].filter(Boolean).join('\n\n') || undefined, mode, offer)
    if (!failOnError) return state
    const { cwd } = await studioProjects.builderLaunch(key)
    const started = Date.now()
    let idle = 0
    while (Date.now() - started < DRAFT_TIMEOUT_MS) {
      const made = (await listArtifacts(cwd)).length
      if (made >= DIRECTIONS) return state
      const now = await studioBuilder.state(key)
      const failed = now.items.slice(-3).find((item) => item.kind === 'error')
      if (failed) throw new Error(failed.text.replace(/^Pikku could not take the request: /, ''))
      idle = now.busy ? 0 : idle + 1
      if (idle >= 6) {
        if (made) return state
        throw new Error('The builder stopped without making a first draft.')
      }
      await pause(5000)
    }
    throw new Error('The builder took too long to make a first draft.')
  },
})
