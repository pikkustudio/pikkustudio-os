import type { I18nNode } from '@pikku/react'

export function Notice({ children }: { children: I18nNode }) {
  return <p className="text-px13 text-pretty text-muted-foreground">{children}</p>
}
