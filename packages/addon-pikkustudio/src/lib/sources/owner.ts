export type Owner = 'local' | 'fabric'

export interface Switch<T> {
  owner(): Owner
  local: T
  fabric: T
}

export const active = <T>(s: Switch<T>): T => (s.owner() === 'fabric' ? s.fabric : s.local)

export const ownerFor = (linked: boolean, signedIn: boolean): Owner => (linked && signedIn ? 'fabric' : 'local')
