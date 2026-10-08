import { existsSync, readFileSync, symlinkSync } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { impeccableSkill, packageDir } from './pi.js'
import { STUDIO_SKILLS } from './studio-skills.js'
import { createHash } from 'node:crypto'
import { listSkillFiles, listSkillNames, readSkillFile, SKILL_FILES } from '@pikku/skills'

const CLOUD_ONLY = /fabric/

export const builderHome = () => process.env.PIKKU_BUILDER_HOME ?? join(homedir(), '.pikku', 'builder')


const DOCUMENT_SKILL = `---
name: impeccable-document
description: Use to write DESIGN.md at the project root from a finished design page.
---

Read [reference/document.md](reference/document.md) and follow it to write DESIGN.md from the page you are given.
`

const documentRef = (): string | null => {
  try {
    const from = join(impeccableSkill(), 'reference', 'document.md')
    return existsSync(from) ? from : null
  } catch {
    return null
  }
}

const ownHash = () => createHash('sha256').update(JSON.stringify(STUDIO_SKILLS)).update(DOCUMENT_SKILL).digest('hex').slice(0, 8)

const skillsVersion = (): string => {
  try {
    return `${JSON.parse(readFileSync(join(packageDir('@pikku/skills'), 'package.json'), 'utf8')).version}-${ownHash()}`
  } catch {
    return createHash('sha256').update(JSON.stringify(SKILL_FILES)).update(ownHash()).digest('hex').slice(0, 16)
  }
}

export async function writeSkills(home = builderHome()): Promise<string> {
  const dir = join(home, 'skills', skillsVersion())
  if (existsSync(dir)) return dir
  const staging = `${dir}.${process.pid}`
  await rm(staging, { recursive: true, force: true })
  for (const name of await listSkillNames()) {
    if (CLOUD_ONLY.test(name)) continue
    for (const path of await listSkillFiles(name)) {
      const text = await readSkillFile(path)
      if (text === null) continue
      const target = join(staging, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, text)
    }
  }
  for (const [path, text] of Object.entries(STUDIO_SKILLS)) {
    const target = join(staging, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  const ref = documentRef()
  if (ref) {
    await mkdir(join(staging, 'impeccable-document', 'reference'), { recursive: true })
    await writeFile(join(staging, 'impeccable-document', 'SKILL.md'), DOCUMENT_SKILL)
    symlinkSync(ref, join(staging, 'impeccable-document', 'reference', 'document.md'))
  }
  await mkdir(dirname(dir), { recursive: true })
  await rename(staging, dir).catch(async (error) => {
    if (!existsSync(dir)) throw error
    await rm(staging, { recursive: true, force: true })
  })
  return dir
}
