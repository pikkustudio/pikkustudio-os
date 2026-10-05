import type { ReactNode } from 'react'

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>
}
