import { z } from 'zod'

export const ContentSide = z.enum(['private', 'public'])

export type ContentSideName = z.infer<typeof ContentSide>

export interface ContentStore {
  signContentKey?(args: { bucket: string; contentKey: string; visibility?: ContentSideName; dateLessThan: Date }): Promise<string>
  getUploadURL(args: { bucket: string; fileKey: string; contentType: string; size?: number; visibility?: ContentSideName }): Promise<{ uploadUrl: string; assetKey: string; uploadMethod?: 'PUT' | 'POST'; uploadHeaders?: Record<string, string> }>
  deleteFile(args: { bucket: string; key: string; visibility?: ContentSideName }): Promise<boolean>
  getDownloadURL?(args: { bucket: string; key: string; visibility?: ContentSideName; expiresInSeconds?: number }): Promise<string>
  deleteByPrefix?(bucket: string, prefix: string, visibility?: ContentSideName): Promise<number>
  listFilesByPrefix?(bucket: string, prefix: string, visibility?: ContentSideName): Promise<string[]>
}

export const contentStore = (content: unknown): ContentStore => {
  if (!content) throw new Error('Studio has no content store')
  return content as ContentStore
}

export const contentCapabilities = (store: ContentStore) => ({
  canList: typeof store.listFilesByPrefix === 'function',
  canRemoveFolders: typeof store.deleteByPrefix === 'function' || typeof store.listFilesByPrefix === 'function',
  canDownload: typeof store.getDownloadURL === 'function' || typeof store.signContentKey === 'function',
})
