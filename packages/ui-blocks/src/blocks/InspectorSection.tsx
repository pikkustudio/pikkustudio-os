import type { I18nNode, I18nString } from '@pikku/react'

export function InspectorSection({ title, children }: { title?: I18nString; children: I18nNode }) {
  return (
    <div>
      {title ? <h3 className="mb-2 text-px14 font-bold tracking-normal text-muted-foreground">{title}</h3> : null}
      {children}
    </div>
  )
}
