import type { InboxHighlights } from './types.js'

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

const decode = (value: string) => value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match] ?? match)

const plain = (html: string) =>
  decode(
    html
      .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|tr|li|h[1-6])>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()

const SKIP = /unsubscribe|preferences|privacy|terms|mailto:|tel:/i
const CODE_HINT = /code|otp|pin|passcode|verification|verify|one[- ]time/i
const YEAR = /^(19|20)\d{2}$/
const CODE = /\b(\d{3}[ -]?\d{3}|\d{4,8})\b/g

const links = (html: string, text: string) => {
  const found = new Map<string, string>()
  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = decode(match[1]!.trim())
    if (!/^https?:\/\//i.test(url) || SKIP.test(url)) continue
    const label = plain(match[2]!)
    if (!found.has(url) || (!found.get(url) && label)) found.set(url, label)
  }
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')]+/gi)) {
    const url = match[0].replace(/[.,;:!?]+$/, '')
    if (!SKIP.test(url) && !found.has(url)) found.set(url, '')
  }
  return [...found].map(([url, label]) => ({ url, label: label || url }))
}

const codes = (text: string) => {
  const out: string[] = []
  for (const line of text.split('\n')) {
    if (!CODE_HINT.test(line)) continue
    for (const match of line.matchAll(CODE)) {
      const value = match[1]!.trim()
      if (YEAR.test(value)) continue
      if (!out.includes(value)) out.push(value)
    }
  }
  return out
}

export function extractHighlights(input: { subject?: string; html: string; text: string }): InboxHighlights {
  const body = input.text || plain(input.html)
  const foundCodes = codes(`${input.subject ?? ''}\n${body}`)
  const foundLinks = links(input.html, body)
  const primary: InboxHighlights['primary'] = foundCodes[0]
    ? { kind: 'code', value: foundCodes[0] }
    : foundLinks[0]
      ? { kind: 'link', value: foundLinks[0].url, label: foundLinks[0].label }
      : null
  return { primary, links: foundLinks, codes: foundCodes }
}
