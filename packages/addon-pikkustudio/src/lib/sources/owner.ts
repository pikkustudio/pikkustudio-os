/** Who answers for a project: `local`, or the namespace of the contributed source it is linked to. */
export type Owner = string

export interface Switch<T> {
  owner(): Owner
  local: T
  sources: Record<string, T>
}

export const active = <T>(s: Switch<T>): T => s.sources[s.owner()] ?? s.local

export const ownerFor = (source: string | null, signedIn: boolean): Owner => (source && signedIn ? source : 'local')
