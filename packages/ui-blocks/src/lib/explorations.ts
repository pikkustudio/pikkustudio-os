import type { Artifact } from '../types/artifacts'

/** Every Design belongs to an exploration (those without an explicit one form the "first" round). */
export const explorationMemberOf = (a: Artifact) => (a.kind === 'Design' ? (a.exploration ?? 'first') : undefined)

/** Artifacts that are not exploration members: these are the ones listed as their own cards on the root artifacts page. */
export const withoutExplorationMembers = (items: Artifact[]) => items.filter((a) => explorationMemberOf(a) === undefined)

/** An id for a brand-new exploration, chosen by the UI so the agent is told it instead of inventing one and the page can open it. */
export const newExplorationId = () => `x${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}`
