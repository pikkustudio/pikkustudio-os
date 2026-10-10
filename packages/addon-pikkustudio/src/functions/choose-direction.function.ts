import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { getArtifact } from '../services/artifacts.js'

const BUILD_CHOSEN = (id: string) =>
  `The owner chose the design direction in artifacts/${id}. Step 1: read artifacts/${id}/index.html and artifact.json, then use the impeccable-document skill on that page to write DESIGN.md at the project root. Step 2: set the colours, fonts and radius from DESIGN.md as theme tokens with 'pikku theme apply' (never by editing theme.css). Step 3: build the page at / in apps/app from that direction, from the app's own components, with every string through m.*() and no copied HTML, so the owner can see it quickly. Run the checks in AGENTS.md before you stop (an unflagged stub is expected). End your last message by asking the owner, in one short question, whether to create more screens, and name the two or three screens this app most likely needs next.`

const EMAILS_CHOSEN = (id: string) =>
  `The owner chose the design direction in artifacts/${id}. Read artifacts/${id}/index.html and artifact.json for the brand colour and fonts, knowledge/index.md for the app name, and DESIGN.md at the project root if it already exists. Then theme every email in emails/ from the brand colour, name the app in every template and subject, rewrite the starter wording in the owner's voice in every language, run 'pikku emails generate' and render each template to check it. Do not ask the owner anything the files answer.`

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
    await studioBuilder.prompt(key, EMAILS_CHOSEN(artifactId), undefined, 'emails')
    return { artifactId }
  },
})
