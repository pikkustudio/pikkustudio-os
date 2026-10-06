import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { getArtifact } from '../services/artifacts.js'

const SCREENS = ['A list of everything', 'One item in detail', 'Add or change an item', 'Settings', 'Sign in']

export const StartPrototypeInput = z.object({ key: z.string(), artifactId: z.string() })

export const startPrototype = pikkuSessionlessFunc({
  expose: true,
  description: 'Turn a chosen design direction into the first screen of the prototype.',
  input: StartPrototypeInput,
  func: async ({ studioBuilder, studioProjects }, { key, artifactId }) => {
    const { cwd } = await studioProjects.builderLaunch(key)
    const app = join(cwd, 'prototypes', 'app')
    if (!existsSync(join(app, 'PROTOTYPE.md'))) throw new Error('This project was made before prototypes existed.')
    const artifact = await getArtifact(cwd, artifactId)
    if (!artifact?.html) throw new Error('That design could not be found.')
    await mkdir(join(app, 'reference'), { recursive: true })
    await cp(join(cwd, 'artifacts', artifactId, 'index.html'), join(app, 'reference', `${artifactId}.html`))
    const metaPath = join(cwd, 'artifacts', artifactId, 'artifact.json')
    const meta = existsSync(metaPath) ? JSON.parse(await readFile(metaPath, 'utf8')) : {}
    await writeFile(metaPath, JSON.stringify({ ...meta, chosen: true }, null, 2) + '\n')
    await studioBuilder.prototype(
      key,
      `Make the home screen at "/" from reference/${artifactId}.html ("${artifact.title}"). Use the blocks, give it realistic mock data through usePikkuQuery, and add it to the nav in src/routes/__root.tsx.`,
    )
    await studioBuilder.say(key, `[[screens:${SCREENS.join('|')}]]Your first screen is on its way. Which other screens should I sketch?`)
    return { artifactId }
  },
})
