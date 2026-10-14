export type Owner = 'local' | 'cloud'

export interface Switch<T> {
  owner(): Owner
  local: T
  cloud: T
}

export const active = <T>(s: Switch<T>): T => (s.owner() === 'cloud' ? s.cloud : s.local)

export const ownerFor = (linked: boolean, signedIn: boolean): Owner => (linked && signedIn ? 'cloud' : 'local')
