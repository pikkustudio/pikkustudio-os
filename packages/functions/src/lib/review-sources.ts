import type { FunctionsMeta } from '@pikku/core/services'
import type { UiMeta } from '@pikkustudio/addon-review/ui-types'
import { scanUiSources } from '@pikkustudio/addon-review/ui-scan'
import { sourceOf } from '@pikkustudio/addon-studio/services'

export interface ReviewRef {
  projectId: string | null
  gitSha: string | null
}

/** What Review reads from Studio's projects: the project's key is its id, so a source's key reads from its workspace. */
export interface ReviewProjects {
  projectMeta(key: string): Promise<Record<string, unknown> | null>
  projectUiFiles(key: string): Promise<{ path: string; content: string }[]>
}

/**
 * A project on this computer that Studio doesn't know has nothing to review (null). A source's project is read from its
 * workspace, and a workspace that fails is an error, not an empty review.
 */
const quietly = async <T>(projectId: string, read: () => Promise<T>): Promise<T | null> => (sourceOf(projectId) ? read() : read().catch(() => null))

/** Review's function meta: the project's generated verbose meta, wherever the project is. */
export const studioMetaSource = (projects: ReviewProjects) => ({
  async read(ref: ReviewRef): Promise<FunctionsMeta | null> {
    if (!ref.projectId) return null
    return ((await quietly(ref.projectId, () => projects.projectMeta(ref.projectId!))) as FunctionsMeta | null) ?? null
  },
})

/** Review's screens: a scan of the project's frontend source, wherever the project is; null when it has none. */
export const studioUiSource = (projects: ReviewProjects) => ({
  async read(ref: ReviewRef): Promise<UiMeta | null> {
    if (!ref.projectId) return null
    const files = await quietly(ref.projectId, () => projects.projectUiFiles(ref.projectId!))
    return files?.length ? scanUiSources(files) : null
  },
})
