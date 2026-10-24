import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectShotInput = z.object({ key: z.string(), path: z.array(z.string()) })

export const projectShot = pikkuSessionlessFunc({
  expose: true,
  description: 'A screenshot the builder took of a project page.',
  input: ProjectShotInput,
  func: async ({ studioProjects }, { key, path }) => {
    const root = join(await studioProjects.projectDir(key), '.pikku', 'builder', 'looks')
    const file = normalize(join(root, ...path.slice(path[0] === '.pikku' ? 3 : 0)))
    if (!file.startsWith(root + sep) || extname(file) !== '.png' || !existsSync(file)) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return new Response(await readFile(file), {
      headers: { 'content-type': 'image/png', 'cache-control': 'no-cache' },
    })
  },
})
