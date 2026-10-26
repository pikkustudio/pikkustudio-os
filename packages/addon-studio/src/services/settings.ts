import { memorySetting, type SettingStore } from './setting-store.js'

/** `local`, or the namespace of the contributed source Studio signed in to. */
export type SignInChoice = string

export interface StudioSettings {
  signIn: SignInChoice | null
  name: string | null
  about: string | null
}

const EMPTY: StudioSettings = { signIn: null, name: null, about: null }

/** Who this Studio is and where it signed in, kept in the settings store (a row of `setting` on a host with a database). */
export class StudioSettingsStore {
  constructor(private store: SettingStore<Partial<StudioSettings>> = memorySetting()) {}

  async read(): Promise<StudioSettings> {
    return { ...EMPTY, ...(await this.store.get()) }
  }

  async update(patch: Partial<StudioSettings>) {
    const next = { ...(await this.read()), ...patch }
    await this.store.set(next)
    return next
  }
}
