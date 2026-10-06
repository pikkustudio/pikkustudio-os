export type Artifact = {
  id: string
  kind: 'Design' | 'Page' | 'Document'
  title: string
  summary: string
  device?: 'computer' | 'phone'
  exploration?: string
  mode?: 'extreme' | 'controlled'
  chosen?: boolean
  at: number
  html?: string
  text?: string
}

export const artifactWhen = (at: number) =>
  new Date(at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
