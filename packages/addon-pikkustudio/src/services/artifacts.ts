import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { compile } from '@tailwindcss/node'

export type ProjectArtifact = {
  id: string
  kind: 'Design' | 'Page' | 'Document'
  title: string
  summary: string
  device?: 'computer' | 'phone'
  at: number
  html?: string
  text?: string
}

const kinds = ['Design', 'Page', 'Document'] as const

const compiled = new Map<string, string>()

const withTailwind = async (html: string): Promise<string> => {
  if (/<style[\s>]/i.test(html) && !/class=/.test(html)) return html
  const cached = compiled.get(html)
  if (cached) return cached
  const candidates = [...new Set(html.match(/[^\s"'`<>=]+/g) ?? [])]
  const css = await compile('@import "tailwindcss";', { base: process.cwd(), onDependency: () => {} }).then((c) => c.build(candidates)).catch(() => '')
  const out = css ? (/<\/head>/i.test(html) ? html.replace(/<\/head>/i, `<style>${css}</style></head>`) : `<style>${css}</style>${html}`) : html
  compiled.set(html, out)
  return out
}

const read = (path: string) => readFile(path, 'utf8').catch(() => undefined)

const load = async (root: string, id: string): Promise<ProjectArtifact | undefined> => {
  const dir = join(root, id)
  const [meta, html, text, info] = await Promise.all([
    read(join(dir, 'artifact.json')),
    read(join(dir, 'index.html')),
    read(join(dir, 'doc.md')),
    stat(dir).catch(() => undefined),
  ])
  if (!info || (html === undefined && text === undefined)) return undefined
  const parsed = (() => {
    try {
      return meta ? (JSON.parse(meta) as Partial<ProjectArtifact>) : {}
    } catch {
      return {}
    }
  })()
  const kind = kinds.find((k) => k === parsed.kind) ?? (html !== undefined ? 'Design' : 'Document')
  return {
    id,
    kind,
    title: parsed.title ?? id,
    summary: parsed.summary ?? '',
    ...(parsed.device ? { device: parsed.device } : {}),
    at: info.mtimeMs,
    ...(html !== undefined ? { html: await withTailwind(html) } : {}),
    ...(text !== undefined ? { text } : {}),
  }
}

export const listArtifacts = async (projectDir: string): Promise<ProjectArtifact[]> => {
  const root = join(projectDir, 'artifacts')
  const ids = await readdir(root).catch(() => [] as string[])
  const found = await Promise.all(ids.map((id) => load(root, id)))
  return found.filter((a): a is ProjectArtifact => !!a).sort((a, b) => b.at - a.at)
}

export const getArtifact = (projectDir: string, id: string) =>
  /^[\w.-]+$/.test(id) ? load(join(projectDir, 'artifacts'), id) : Promise.resolve(undefined)
