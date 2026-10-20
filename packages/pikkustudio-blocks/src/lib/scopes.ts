import { useShellAccount } from './account'

// The viewer's scopes decide which screens and nav entries show. This is not access control: the functions behind a
// screen check scopes themselves. The rules are Pikku's: a grant covers itself, its children (`a` covers `a:b`) and a
// wildcard covers its level (`a:*`, `*`). Nothing held satisfies nothing.

const satisfying = (scope: string) => {
  const parts = scope.split(':')
  const grants = [scope, `${scope}:*`]
  for (let i = 0; i < parts.length; i++) grants.push([...parts.slice(0, i), '*'].join(':'))
  for (let i = 1; i < parts.length; i++) grants.push(parts.slice(0, i).join(':'))
  return grants
}

export const hasScopes = (required: readonly string[] | undefined, held: readonly string[] | undefined) => {
  if (!required?.length) return true
  const grants = new Set(held ?? [])
  return required.every((scope) => satisfying(scope).some((grant) => grants.has(grant)))
}

/** The viewer's scopes; undefined until studio:account answers, so a scoped screen stays hidden until then. */
export const useViewerScopes = (): readonly string[] | undefined => useShellAccount().data?.scopes

/** Whether the viewer may see something that asks for these scopes. */
export const useCanSee = () => {
  const held = useViewerScopes()
  return (required: readonly string[] | undefined) => hasScopes(required, held)
}
