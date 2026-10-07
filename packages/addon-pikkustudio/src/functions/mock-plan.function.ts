import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { readMockPlan } from '../services/mock-plan.js'

export const MockPlanInput = z.object({ key: z.string() })

export const MockPlanOutput = z.object({
  available: z.boolean(),
  added: z.array(z.object({ rpc: z.string(), scenarios: z.array(z.string()) })),
  changed: z.array(z.object({ rpc: z.string(), reason: z.string() })),
  invalid: z.array(z.object({ rpc: z.string(), reason: z.string() })),
})

export const mockPlan = pikkuSessionlessFunc({
  expose: true,
  description: 'What a project still needs behind its sample data: mocked RPCs with no function (added), RPCs whose sample data no longer fits the function (changed) and sample data that cannot be read (invalid), straight from pikku mocks diff. Lists only, starts nothing.',
  input: MockPlanInput,
  output: MockPlanOutput,
  func: async ({ studioProjects }, { key }) => readMockPlan(await studioProjects.projectDir(key)),
})
