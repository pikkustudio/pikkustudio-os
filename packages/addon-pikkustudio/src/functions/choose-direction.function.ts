import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { getArtifact } from '../services/artifacts.js'

export const ChooseDirectionInput = z.object({ key: z.string(), artifactId: z.string() })

export const chooseDirection = pikkuSessionlessFunc({
  expose: true,
  description: 'Mark a design direction as the chosen one.',
  input: ChooseDirectionInput,
  func: async ({ studioProjects }, { key, artifactId }) => {
    const { cwd } = await studioProjects.builderLaunch(key)
    if (!(await getArtifact(cwd, artifactId))) throw new Error('That design could not be found.')
    const metaPath = join(cwd, 'artifacts', artifactId, 'artifact.json')
    const meta = existsSync(metaPath) ? JSON.parse(await readFile(metaPath, 'utf8')) : {}
    await writeFile(metaPath, JSON.stringify({ ...meta, chosen: true }, null, 2) + '\n')
    return { artifactId }
  },
})
