import type { FunctionsMeta } from '@pikku/core/services'

export interface MetaRef {
  projectId: string | null
  gitSha: string | null
}

/**
 * Where the queue's raw material comes from. A standalone repo reads the
 * generated `.pikku` directory on disk; the cloud reads the blob it uploaded for
 * one project at one sha. The addon only needs the verbose meta itself, so it
 * depends on this rather than on either host's storage.
 */
export interface MetaSource {
  read(ref: MetaRef): Promise<FunctionsMeta | null>
}
