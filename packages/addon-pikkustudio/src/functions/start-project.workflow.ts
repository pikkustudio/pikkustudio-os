import { z } from 'zod'
import { pikkuWorkflowFunc } from '#pikku/addon/workflow'

export const StartProjectInput = z.object({ name: z.string(), idea: z.string(), key: z.string().optional() })
export const StartProjectOutput = z.object({ key: z.string() })

export const startProject = pikkuWorkflowFunc({
  description: 'Create a project, bring up its workspace, database and dev server, fix it if it will not start, and hand the idea to the builder.',
  input: StartProjectInput,
  output: StartProjectOutput,
  func: async (_services, data, { workflow }) => {
    let made: { key: string } | undefined
    if (!data.key) {
      made = await workflow.do('Make the project', 'createProject', { name: data.name, idea: data.idea })
    }
    const key = data.key ?? made!.key
    await workflow.do('Set up its workspace', 'prepareProject', { key })
    const data1 = await workflow.do('Set up its database', 'setUpDatabase', { key }, { retries: 0 })
    let data2: { ok: boolean; problem?: string } | undefined
    if (!data1.ok) {
      await workflow.do('Fix what stopped it', 'healProject', { key, problem: data1.problem ?? '' }, { retries: 0 })
      data2 = await workflow.do('Set up its database again', 'setUpDatabase', { key }, { retries: 0 })
      if (!data2.ok) await workflow.do('Give up', 'failProject', { problem: data2.problem ?? 'It would not set up.' }, { retries: 0 })
    }
    const started = await workflow.do('Start it', 'startAndWait', { key }, { retries: 0 })
    let again: { ok: boolean; problem?: string } | undefined
    if (!started.ok) {
      await workflow.do('Fix what stopped it starting', 'healProject', { key, problem: started.problem ?? '' }, { retries: 0 })
      again = await workflow.do('Start it again', 'startAndWait', { key }, { retries: 0 })
      if (!again.ok) await workflow.do('Give up starting', 'failProject', { problem: again.problem ?? 'It would not start.' }, { retries: 0 })
    }
    await workflow.do('Ask for a first draft', 'builderPrompt', {
      key,
      message: data.idea,
      failOnError: true,
      context:
        'Before building anything, explore four different design directions for this for the owner to compare. Do not read knowledge files or explore the project first; the project is new and has nothing about this yet. Create the files straight away. Make each direction look clearly different from the others in layout, colour and tone, not four variations of one idea. For each, write artifacts/direction-1 to artifacts/direction-4, each with index.html as one self-contained page (inline CSS, no scripts, no external files), with whatever CSS and layout suit the direction. Do not limit yourself to any framework or component library and artifact.json as {"kind":"Design","title":"a short name for the direction","summary":"one plain sentence an owner would use about what makes it different"}. Write them one after another so the first appears early. Do not change the app yet.',
    }, { retries: 0 })
    return { key }
  },
})
