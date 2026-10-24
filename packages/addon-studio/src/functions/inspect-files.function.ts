import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const InspectFilesInput = z.object({ key: z.string(), names: z.array(z.string()) })
export const InspectFilesOutput = z.object({ summary: z.string() })

export const inspectFiles = pikkuSessionlessFunc({
  description: 'Read the files an owner attached and write down what is in them as knowledge notes.',
  input: InspectFilesInput,
  output: InspectFilesOutput,
  func: async ({ studioBuilder, studioProjects }, { key, names }) => {
    const { cwd } = await studioProjects.builderLaunch(key)
    const files = names.map((name) => ({ name, path: join(cwd, '.pikku-runtime', 'content', 'private', 'attachments', name) }))
    if (!(await studioBuilder.inspect(key, files))) return { summary: '' }
    const summary = await readFile(join(cwd, 'knowledge', 'attachments', 'index.md'), 'utf8').catch(() => '')
    return { summary: summary.slice(0, 6000) }
  },
})
