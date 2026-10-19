import type { StudioProject, StudioProjectsService } from './projects.js'

/**
 * Fields an addon adds to every project Studio lists, worked out in the background.
 *
 * Studio calls `reconcile` whenever the set of open projects changes and when it wakes, and `stop` when it sleeps,
 * so whatever the decorator watches follows the projects that are actually open.
 */
export interface ProjectDecorator {
  decorate(project: StudioProject): Record<string, unknown>
  reconcile(): Promise<void>
  stop(): void
}

/** Builds a decorator over the projects it decorates; contributed by an addon as `projectDecorators.<addon>`. */
export type ProjectDecoratorFactory = (projects: StudioProjectsService) => ProjectDecorator

/** What an addon reporting Studio's presence elsewhere can read. */
export interface PresenceHost {
  projects: StudioProjectsService
  idleMinutes(): Promise<number>
  location: 'desktop' | 'cloud'
}

/** Background reporting that runs while Studio is up, contributed as `studioPresence.<addon>`; returns how to stop it. */
export type StudioPresence = (host: PresenceHost, logger: { warn(message: string): void }) => () => void
