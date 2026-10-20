import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/** `local`, or the namespace of the contributed source Studio signed in to. */
export type SignInChoice = string

export interface StudioSettings {
  signIn: SignInChoice | null
  name: string | null
  about: string | null
}

export class StudioSettingsFile {
  constructor(private path: string) {}

  async read(): Promise<StudioSettings> {
    if (!existsSync(this.path)) return { signIn: null, name: null, about: null }
    return { signIn: null, name: null, about: null, ...JSON.parse(await readFile(this.path, 'utf8')) }
  }

  async update(patch: Partial<StudioSettings>) {
    const next = { ...(await this.read()), ...patch }
    await mkdir(join(this.path, '..'), { recursive: true })
    await writeFile(this.path, JSON.stringify(next, null, 2) + '\n')
    return next
  }
}
