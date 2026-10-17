import type { ComponentType } from 'react'
import type { Project } from '../blocks/ProjectCard'
import type { ListedProject } from '../blocks/TeamProjects'
import { useSlots, type Slots } from './slots'

export type ProjectOverlay = Partial<Pick<Project, 'state' | 'note' | 'when' | 'usage' | 'live' | 'attention' | 'workingNow' | 'image' | 'repoUrl'>>

export type ProjectSlots = {
  useProjectOverlay?: (projects: ListedProject[]) => Record<string, ProjectOverlay>
  ProjectCardExtra?: ComponentType<{ item: Project }>
  ProjectsLead?: ComponentType
}

export const useProjectSlots = () => useSlots() as Slots & ProjectSlots
