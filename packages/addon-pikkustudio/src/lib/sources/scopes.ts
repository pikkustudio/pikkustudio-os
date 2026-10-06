export const DEFAULT_SCOPE = 'default'
export const DEV_SCOPE = 'dev'
export const CI_SCOPE = 'ci'

export type Target = { kind: 'dev' | 'ci'; workspace?: string }

export const workspaceScope = (name: string) => `workspace:${name}`

const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/

export const SCOPE = /^(default|dev|ci|workspace:[a-z0-9][a-z0-9-]{0,39})$/

export const isScope = (value: string) => SCOPE.test(value)

export const chainFor = (target: Target): string[] => {
  const chain = [DEFAULT_SCOPE, target.kind === 'ci' ? CI_SCOPE : DEV_SCOPE]
  if (target.workspace) {
    if (!NAME.test(target.workspace)) throw new Error(`"${target.workspace}" is not a workspace name`)
    chain.push(workspaceScope(target.workspace))
  }
  return chain
}
