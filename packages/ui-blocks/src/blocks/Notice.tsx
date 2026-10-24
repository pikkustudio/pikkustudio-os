import type { I18nNode } from '@pikku/react'

export function Notice({ children, testId }: { children: I18nNode; testId?: string }) {
  return <p data-testid={testId} className="text-px13 text-pretty text-muted-foreground">{children}</p>
}
