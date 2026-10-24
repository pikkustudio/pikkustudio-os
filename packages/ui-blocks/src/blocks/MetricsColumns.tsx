import type { I18nNode } from '@pikku/react'

/** Two columns side by side on wide screens. */
export function MetricsColumns({ children }: { children: I18nNode }) {
  return <div className="grid gap-4 lg:grid-cols-2">{children}</div>
}
