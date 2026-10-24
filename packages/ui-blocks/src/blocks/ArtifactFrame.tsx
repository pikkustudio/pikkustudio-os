import type { I18nString } from '@pikku/react'
export function ArtifactFrame({ html, title, className }: { html: string; title: I18nString; className?: string }) {
  return <iframe title={title} srcDoc={html} sandbox="" className={`block size-full border-0 bg-white ${className ?? ''}`} />
}
