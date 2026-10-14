import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'

export const StartProjectRunInput = z.object({ name: z.string(), idea: z.string(), key: z.string().optional(),
  surfaces: z.array(z.enum(['screens', 'automations', 'assistant', 'commands', 'connection'])).optional(),
  devices: z.array(z.enum(['browser', 'phones'])).optional(),
  uploadId: z.string().optional(),
  path: z.enum(['interview', 'design']).optional(),
})
export const StartProjectRunOutput = z.object({ runId: z.string() })

export const startProjectRun = pikkuSessionlessFunc({
  expose: true,
  description: 'Begin making a project from an idea. Follow it with projectRun.',
  input: StartProjectRunInput,
  output: StartProjectRunOutput,
  func: async ({ workflowService }, data, { rpc }) => {
    if (!workflowService) throw new Error('workflowService is required')
    const { runId } = await (rpc as unknown as { startWorkflow: (name: string, data: unknown) => Promise<{ runId: string }> }).startWorkflow('studio:startProject', data)
    return { runId }
  },
})

export const ProjectRunInput = z.object({ runId: z.string() })
export const ProjectRunOutput = z.object({
  status: z.enum(['running', 'suspended', 'completed', 'failed', 'cancelled', 'compensating', 'compensated', 'compensation_failed']),
  steps: z.array(z.object({ name: z.string(), status: z.string() })),
  key: z.string().optional(),
  error: z.string().optional(),
})

export const projectRun = pikkuSessionlessFunc({
  expose: true,
  description: 'Where a project run has got to, step by step.',
  input: ProjectRunInput,
  output: ProjectRunOutput,
  func: async ({ workflowService }, { runId }) => {
    if (!workflowService) throw new Error('workflowService is required')
    const run = await workflowService.getRun(runId)
    const status = await workflowService.getRunStatus(runId)
    if (!run || !status) throw new Error('That run is not here any more')
    const made = (await workflowService.getRunHistory(runId)).find((s) => s.stepName === 'Make the project' && s.status === 'succeeded')
    return {
      status: status.status,
      steps: status.steps.map((s) => ({ name: s.name, status: s.status })),
      key: (run.output as { key?: string } | undefined)?.key ?? (made?.result as { key?: string } | undefined)?.key,
      error: run.error?.message,
    }
  },
})
