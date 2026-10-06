import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { studioHome } from '../services/projects.js'

export const AdoptUploadsInput = z.object({ key: z.string(), uploadId: z.string().regex(/^[a-z0-9-]{8,64}$/) })
export const AdoptUploadsOutput = z.object({ names: z.array(z.string()) })

export const adoptUploads = pikkuSessionlessFunc({
  description: 'Move the files an owner attached into their new project.',
  input: AdoptUploadsInput,
  output: AdoptUploadsOutput,
  func: async ({ studioProjects }, { key, uploadId }) => {
    const from = join(studioHome(), 'uploads', uploadId)
    const names = await readdir(from).catch(() => [] as string[])
    if (!names.length) return { names }
    const { cwd } = await studioProjects.builderLaunch(key)
    const to = join(cwd, '.pikku-runtime', 'content', 'private', 'attachments')
    await mkdir(to, { recursive: true })
    await cp(from, to, { recursive: true })
    await rm(from, { recursive: true, force: true })
    return { names }
  },
})
