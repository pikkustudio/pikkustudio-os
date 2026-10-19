import type { Project } from '../blocks/ProjectCard'

/** What a host adds to a project's card on the Projects screen, by project key, through the `projects.overlay` slot. */
export type ProjectOverlay = Partial<Pick<Project, 'state' | 'note' | 'when' | 'usage' | 'live' | 'attention' | 'workingNow' | 'image' | 'repoUrl' | 'favourite' | 'visitedAt'>>
