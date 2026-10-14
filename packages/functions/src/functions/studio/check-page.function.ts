import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { checkPage as runCheck } from '../../lib/check-page.js'

export const CheckPageInput = z.object({ key: z.string(), path: z.string().default('/') })

export const CheckPageOutput = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('checked'),
    url: z.string(),
    httpStatus: z.number().nullable(),
    title: z.string(),
    errors: z.array(z.string()),
    failedRequests: z.array(z.string()),
  }),
  z.object({
    status: z.literal('needs'),
    tool: z.string(),
    name: z.string(),
    canInstall: z.boolean(),
    missingLibs: z.array(z.string()),
    get: z.object({ brew: z.string().optional(), apt: z.string().optional(), command: z.string().optional(), link: z.string().optional() }),
  }),
])

export const checkPage = pikkuFunc({
  description: "Open a page of a running project in a real browser and report what went wrong on it.",
  expose: true,
  auth: true,
  input: CheckPageInput,
  output: CheckPageOutput,
  func: async ({ studio }, { key, path }) => {
    const running = studio.projects.runningProject(key)
    if (!running) throw new Error('That project is not open')
    return runCheck(studio.tools, running, path)
  },
})
