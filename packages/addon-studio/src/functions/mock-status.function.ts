import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { NO_MOCKS, readMockStatus, type MockStatus } from '../services/mock-status.js'

export const MockStatusInput = z.object({ key: z.string() })

const StubUse = z.object({ rpc: z.string(), file: z.string(), flag: z.string().nullable() })

export const MockStatusOutput = z.object({
  available: z.boolean(),
  flagged: z.array(StubUse),
  unflagged: z.array(StubUse),
  changed: z.array(z.string()),
  dead: z.array(z.string()),
  unused: z.array(z.string()),
  screens: z.number(),
})

export const mockStatus = pikkuSessionlessFunc({
  expose: true,
  description: 'Which parts of a project still show sample data: stubs with and without a feature flag, mocks whose function changed, and mocks nothing uses. Runs pikku mocks check and diff.',
  input: MockStatusInput,
  output: MockStatusOutput,
  func: async ({ studioProjects }, { key }) => {
    const remote = await studioProjects.inWorkspace<MockStatus>(key, 'mockStatus', {}, NO_MOCKS)
    return remote ? remote.answer : readMockStatus(await studioProjects.projectDir(key))
  },
})
