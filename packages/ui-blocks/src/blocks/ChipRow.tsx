import type { I18nNode } from '@pikku/react'

export function ChipRow({ children }: { children: I18nNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>
}
