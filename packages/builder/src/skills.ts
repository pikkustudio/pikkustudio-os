import { existsSync, lstatSync, readFileSync, readdirSync, symlinkSync } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { linkedAddons, type LinkedAddon } from './agents.js'
import { impeccableSkill, packageDir } from './pi.js'
import { STUDIO_SKILLS } from './studio-skills.js'
import { createHash } from 'node:crypto'
import { listSkillFiles, listSkillNames, readSkillFile, SKILL_FILES } from '@pikku/skills'

const CLOUD_ONLY = /cloud/

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

const SKILL_NAME = /^[a-z0-9][a-z0-9._-]*$/

const filesUnder = (dir: string, prefix: string): [string, Buffer][] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry): [string, Buffer][] => {
    const path = join(dir, entry.name)
    // a link could lead out of the package, so only real files and folders are taken
    if (lstatSync(path).isSymbolicLink()) return []
    if (entry.isDirectory()) return filesUnder(path, `${prefix}/${entry.name}`)
    return entry.isFile() ? [[`${prefix}/${entry.name}`, readFileSync(path)]] : []
  })

/** The skills the linked addons ship (`skills/<name>/` in each package, by that name): skill name -> its files (relative to the skills folder). */
export function addonSkills(addons: LinkedAddon[]): Map<string, { addon: string; files: [string, Buffer][] }> {
  const found = new Map<string, { addon: string; files: [string, Buffer][] }>()
  for (const { addon, dir } of addons) {
    const root = join(dir, 'skills')
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      const at = join(root, entry.name)
      if (!entry.isDirectory() || !SKILL_NAME.test(entry.name) || lstatSync(at).isSymbolicLink() || !existsSync(join(at, 'SKILL.md'))) continue
      if (found.has(entry.name)) {
        console.warn(`[builder] skill ${entry.name} of the ${addon} addon is skipped: ${found.get(entry.name)!.addon} already ships one`)
        continue
      }
      found.set(entry.name, { addon, files: filesUnder(at, entry.name).sort(([a], [b]) => (a < b ? -1 : 1)) })
    }
  }
  return found
}

const addonHash = (skills: ReturnType<typeof addonSkills>) => {
  if (!skills.size) return ''
  const hash = createHash('sha256')
  for (const [name, { files }] of [...skills].sort(([a], [b]) => (a < b ? -1 : 1))) {
    hash.update(`\0${name}`)
    for (const [path, data] of files) hash.update(`\0${path}\0`).update(data)
  }
  return `-${hash.digest('hex').slice(0, 8)}`
}

const skillsVersion = (addons: ReturnType<typeof addonSkills>): string => {
  try {
    return `${JSON.parse(readFileSync(join(packageDir('@pikku/skills'), 'package.json'), 'utf8')).version}-${ownHash()}${addonHash(addons)}`
  } catch {
    return createHash('sha256').update(JSON.stringify(SKILL_FILES)).update(ownHash()).update(addonHash(addons)).digest('hex').slice(0, 16)
  }
}

export async function writeSkills(home = builderHome(), linked: LinkedAddon[] = linkedAddons()): Promise<string> {
  const shipped = addonSkills(linked)
  const dir = join(home, 'skills', skillsVersion(shipped))
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
  for (const [name, { addon, files }] of shipped) {
    if (existsSync(join(staging, name))) {
      console.warn(`[builder] skill ${name} of the ${addon} addon is skipped: Studio already has one with that name`)
      continue
    }
    for (const [path, data] of files) {
      const target = join(staging, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, data)
    }
  }
  await mkdir(dirname(dir), { recursive: true })
  await rename(staging, dir).catch(async (error) => {
    if (!existsSync(dir)) throw error
    await rm(staging, { recursive: true, force: true })
  })
  return dir
}
