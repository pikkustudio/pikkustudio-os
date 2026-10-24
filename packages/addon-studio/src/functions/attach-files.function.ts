import { mkdir, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { studioHome } from '../services/projects.js'

export const AttachFileInput = z.object({ uploadId: z.string().regex(/^[a-z0-9-]{8,64}$/), name: z.string().min(1), data: z.string() })

export const attachFile = pikkuSessionlessFunc({
  expose: true,
  description: 'Keep a file the owner attached until their new project exists.',
  input: AttachFileInput,
  func: async (_services, { uploadId, name, data }) => {
    const bytes = Buffer.from(data, 'base64')
    if (bytes.length > 25 * 1024 * 1024) throw new Error('That file is too big. Keep each one under 25 MB.')
    const safe = basename(name).replace(/[^\w.\- ]+/g, '_')
    const dir = join(studioHome(), 'uploads', uploadId)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, safe), bytes)
    return { name: safe }
  },
})
