import type { ReactNode } from 'react'

export function InspectorSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div>
      {title ? <h3 className="mb-2 text-px14 font-bold tracking-normal text-muted-foreground">{title}</h3> : null}
      {children}
    </div>
  )
}
