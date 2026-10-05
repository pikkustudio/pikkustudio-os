export function ArtifactFrame({ html, title, className }: { html: string; title: string; className?: string }) {
  return <iframe title={title} srcDoc={html} sandbox="" className={`block size-full border-0 bg-white ${className ?? ''}`} />
}
