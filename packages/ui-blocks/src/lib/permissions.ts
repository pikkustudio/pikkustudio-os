export type DeclaredPermission = { id: string; description?: string; declared: boolean }

export type Role = { name: string; description?: string; scopes: string[] }

const isAncestorOf = (ancestor: string, id: string) => id.startsWith(`${ancestor}:`)

export const isAllowed = (selected: string[], id: string) => selected.some((s) => s === id || isAncestorOf(s, id))

export const coveredBy = (selected: string[], id: string) => selected.find((s) => s !== id && isAncestorOf(s, id))

export const togglePermission = (selected: string[], id: string): string[] => {
  if (coveredBy(selected, id)) return selected
  if (selected.includes(id)) return selected.filter((s) => s !== id)
  return [...selected.filter((s) => !isAncestorOf(id, s)), id]
}

export const depthOf = (id: string) => id.split(':').length - 1

export const plainName = (p: Pick<DeclaredPermission, 'id' | 'description'>) => {
  if (p.description?.trim()) return p.description.trim()
  const last = p.id.split(':').pop() ?? p.id
  const words = last.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const allowedCount = (role: Role, declared: DeclaredPermission[] | undefined) =>
  declared ? declared.filter((p) => p.declared && isAllowed(role.scopes, p.id)).length : role.scopes.length

export const unusedIn = (role: Role, declared: DeclaredPermission[] | undefined) =>
  declared ? role.scopes.filter((s) => !declared.some((p) => p.id === s && p.declared)) : []

export const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
