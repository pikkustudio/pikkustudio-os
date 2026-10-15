import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type ChatLine = { kind: string; text?: string; at: number; [extra: string]: unknown }

export type ArchivedChat = { id: string; title: string; at: number; items: ChatLine[]; specialist?: string }

const root = (projectDir: string) => join(projectDir, 'chats')

const titleOf = (items: ChatLine[]) => items.find((i) => i.kind === 'user' && i.text)?.text?.split('\n')[0]!.slice(0, 80) ?? ''

export const archiveChat = async (projectDir: string, id: string, items: ChatLine[], specialist = 'build') => {
  const said = items.filter((i) => i.text && ['user', 'assistant', 'error'].includes(i.kind))
  if (!said.length) throw new Error('There is nothing in this chat to save yet.')
  await mkdir(root(projectDir), { recursive: true })
  const chat: ArchivedChat = { id, title: titleOf(said), at: said[said.length - 1]!.at, items, specialist }
  await writeFile(join(root(projectDir), `${id}.json`), JSON.stringify(chat, null, 2) + '\n')
}

export const getChat = async (projectDir: string, id: string): Promise<ArchivedChat | undefined> => {
  if (!/^[\w.-]+$/.test(id)) return undefined
  try {
    return JSON.parse(await readFile(join(root(projectDir), `${id}.json`), 'utf8'))
  } catch {
    return undefined
  }
}

export const listChats = async (projectDir: string, specialist = 'build'): Promise<Omit<ArchivedChat, 'items'>[]> => {
  const files = (await readdir(root(projectDir)).catch(() => [] as string[])).filter((f) => f.endsWith('.json'))
  const found = await Promise.all(files.map((f) => getChat(projectDir, f.slice(0, -5))))
  return found.flatMap((c) => (c && (c.specialist ?? 'build') === specialist ? [{ id: c.id, title: c.title, at: c.at }] : [])).sort((a, b) => b.at - a.at)
}
