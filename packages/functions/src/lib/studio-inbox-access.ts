import type { InboxAccess } from '@pikkustudio/addon-inbox/types'

interface ProjectLister {
  list(): Promise<Array<{ key: string; cloudProjectId: string | null }>>
}

export const studioInboxAccess = (projects: ProjectLister): InboxAccess => ({
  async canView(session, projectKey) {
    if (!session?.userId) return false
    const id = projectKey.split('.')[0]
    const owned = await projects.list()
    return owned.some((p) => p.key === id || (p.cloudProjectId !== null && p.cloudProjectId === id))
  },
})
