import type { ReviewReason } from './reasons.js'

export interface FixLocation {
  sourceFile: string
  bodyStart: number
  bodyEnd: number
}

export interface CommentFixPromptInput {
  name: string
  body: string
  sourceFile: string
  lineStart: number
  lineEnd: number
  stale: boolean
}

export interface FixPromptInput {
  name: string
  reason: ReviewReason
  note: string | null
  location: FixLocation | null
  stale: boolean
}

const CLOSING =
  'Apply the smallest change that resolves this. Do not reformat, rename, or restructure anything else in the file. If the review is wrong about this code, change nothing and say so.'

const STALE_WARNING =
  'The body has changed since this review was cast. Confirm the problem is still there before editing.'

const locationLine = (name: string, location: FixLocation | null): string =>
  location
    ? `${location.sourceFile}:${location.bodyStart}-${location.bodyEnd} — ${name}`
    : `${name} (source location unknown)`

/**
 * Deterministic: the same verdict and the same meta always produce the same
 * string, so a fix can be diffed, cached and replayed without a model call.
 */
export const buildCommentFixPrompt = ({
  name,
  body,
  sourceFile,
  lineStart,
  lineEnd,
  stale,
}: CommentFixPromptInput): string => {
  const range = lineStart === lineEnd ? `${lineStart}` : `${lineStart}-${lineEnd}`
  const blocks = [`${sourceFile}:${range} — ${name}`, body]

  if (stale) {
    blocks.push(STALE_WARNING)
  }
  blocks.push(CLOSING)

  return blocks.join('\n\n')
}

export const buildFixPrompt = ({ name, reason, note, location, stale }: FixPromptInput): string => {
  const blocks = [locationLine(name, location), reason.label]

  if (reason.guidance) {
    blocks.push(reason.guidance)
  }
  if (note) {
    blocks.push(`Reviewer note: ${note}`)
  }
  if (stale) {
    blocks.push(STALE_WARNING)
  }
  blocks.push(CLOSING)

  return blocks.join('\n\n')
}
