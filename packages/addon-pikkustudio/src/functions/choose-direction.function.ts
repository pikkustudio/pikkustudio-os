import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { getArtifact } from '../services/artifacts.js'

const BUILD_CHOSEN = (id: string) =>
  `The owner chose the design direction in artifacts/${id} (read index.html and artifact.json there). Put its home screen into the real app now, in apps/app, so the owner can see it quickly: set the direction's colours, fonts and radius as theme tokens first with 'pikku theme apply' (never by editing theme.css), then build the page at / from the app's own components, with every string through m.*() and no copied HTML. Run the checks in AGENTS.md before you stop (an unflagged stub is expected).`

export const ChooseDirectionInput = z.object({ key: z.string(), artifactId: z.string() })

export const chooseDirection = pikkuSessionlessFunc({
  expose: true,
  description: 'Mark a design direction as the chosen one and have the builder put its home screen in the app, on sample data.',
  input: ChooseDirectionInput,
  func: async ({ studioProjects, studioBuilder }, { key, artifactId }) => {
    const { cwd } = await studioProjects.builderLaunch(key)
    if (!(await getArtifact(cwd, artifactId))) throw new Error('That design could not be found.')
    const metaPath = join(cwd, 'artifacts', artifactId, 'artifact.json')
    const meta = existsSync(metaPath) ? JSON.parse(await readFile(metaPath, 'utf8')) : {}
    await writeFile(metaPath, JSON.stringify({ ...meta, chosen: true }, null, 2) + '\n')
    await studioBuilder.prompt(key, BUILD_CHOSEN(artifactId), undefined, 'frontend')
    return { artifactId }
  },
})
