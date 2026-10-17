import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const KeepStatusInput = z.object({ key: z.string() })

const remoteOf = (folder: string) =>
  promisify(execFile)('git', ['remote', 'get-url', 'origin'], { cwd: folder }).then(
    (r) => r.stdout.trim() || null,
    () => null,
  )

export const keepStatus = pikkuSessionlessFunc({
  expose: true,
  description: 'Whether a project has work that is not kept yet, and where it is sent when kept.',
  input: KeepStatusInput,
  func: async ({ studioProjects }, { key }) => {
    const status = await studioProjects.keepStatus(key)
    return { ...status, remote: await remoteOf(status.folder) }
  },
})
