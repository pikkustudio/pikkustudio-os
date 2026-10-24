import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export type FileEntry = { name: string; path: string; type: 'file' | 'directory' }
export type FileBody = { path: string; size: number; content: string; binary: boolean; truncated: boolean }

const LANGUAGE: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', jsonc: 'json', scss: 'scss', less: 'less', xml: 'xml', svg: 'xml',
  py: 'python', go: 'go', rs: 'rust', graphql: 'graphql', md: 'markdown', css: 'css',
  html: 'html', yaml: 'yaml', yml: 'yaml', sh: 'shell', toml: 'toml', sql: 'sql',
}

const extOf = (path: string) => (path.includes('.') ? path.split('.').pop()!.toLowerCase() : '')

export const languageOf = (path: string) => LANGUAGE[extOf(path)] ?? 'plaintext'

const KIND: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript (React)', mts: 'TypeScript', cts: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript (React)', mjs: 'JavaScript', cjs: 'JavaScript',
  json: 'JSON', jsonc: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', md: 'Markdown', css: 'CSS', scss: 'SCSS', less: 'Less', html: 'HTML',
  svg: 'SVG', sql: 'SQL', sh: 'Shell', py: 'Python', go: 'Go', rs: 'Rust', graphql: 'GraphQL', xml: 'XML',
}

export const kindOf = (path: string): I18nString => (KIND[extOf(path)] ? asI18n(KIND[extOf(path)]!) : m.code_kind__other())

export const parentOf = (path: string) => path.split('/').slice(0, -1).join('/')

export const nameOf = (path: string) => path.split('/').pop() ?? path

export const isLocalOnly = (error: unknown) => /local development|local environment/i.test((error as { message?: string } | null)?.message ?? '')
