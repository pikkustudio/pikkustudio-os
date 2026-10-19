// The places in Studio's screens an addon can put its own components. Each addon lists what it contributes in its
// own studio.slots.ts (`contributions` typed by `SlotContributionOf<StudioSlots>`), always as lazy imports;
// scripts/gen-addons.mjs gathers them into the app's registry. A slot left empty shows the core default.
import type { ReactNode } from 'react'
import type { Project } from './blocks/ProjectCard'
import type { WorkspaceAboutProps } from './blocks/ShellAccount'
import type { PanelId } from './screens/OnboardingLayout'
import type { TeamScopeProps } from './lib/team'
import { defineStudioSlots, slot, type SlotContributionOf } from './lib/studio-slots'

type Open = (panel: PanelId | '') => void
type NavProps = { itemClass: string; labelClass: string; collapsed: boolean }

export const studioSlots = defineStudioSlots({
  /** The sign-in step's hero, in place of the local one. */
  'onboarding.signIn.hero': slot.single<{ st: string; loading: boolean; open: Open; done: () => void }>(),
  /** The choose-AI step's hero, in place of the LiteLLM one. */
  'onboarding.chooseAi.hero': slot.single<{ st: string; loading: boolean; open: Open; retry: () => void; done: () => void }>(),
  /** More AI choices, above the bring-your-own ones. */
  'onboarding.chooseAi.offers': slot.list<{ open: Open }>(),
  /** The account at the foot of the rail. */
  'shell.account': slot.single<{ expanded: boolean; onOpen: () => void; onAccount: () => void; collapsed?: boolean }>(),
  /** The workspace panel: where the work runs and who can see it. */
  'shell.workspaceAbout': slot.single<WorkspaceAboutProps>(),
  /** The person's name wherever Studio shows it. */
  'shell.accountName': slot.single(),
  /** Links under a project in the rail. */
  'shell.projectNav': slot.list<NavProps>(),
  /** The rail when no project is open. */
  'shell.teamNav': slot.list<NavProps>(),
  /** Above the account at the foot of the rail. */
  'shell.railFoot': slot.list<{ collapsed: boolean }>(),
  /** A team's display name, handed to `children`. */
  'team.name': slot.single<{ children: (name: string) => ReactNode }>(),
  /** Whether the team in the URL is one the person may open. */
  'team.scope': slot.single<TeamScopeProps>(),
  /** Which copy of the open project the screens read and change, in place of the local provider; wraps the shell. */
  'project.targetProvider': slot.single<{ children: ReactNode }>(),
  /** Picks the copy of the project the screens show, at the top of the project rail. */
  'project.targetSwitcher': slot.single<{ collapsed: boolean }>(),
  /** Places to bring a project in from, first in the New project panel; each reports whether it is showing. */
  'project.import.sources': slot.list<{ onImported: (project: string, team?: string) => void; onActive: (active: boolean) => void }>(),
  /** Starting from a terminal instead, under developer details in the same panel. */
  'project.import.developer': slot.list(),
  /** More on a project's card. Its presence also hides the card's own run button. */
  'projects.card.extra': slot.list<{ item: Project }>(),
  /** A publish target's panel on the Publish screen, keyed by the target's id from studio:publishOptions. */
  'publish.target': slot.keyed(),
  /** How published versions go live, keyed by the kind of the copy shown. */
  'versions.releaseMode': slot.keyed(),
  /** What the live copy sent to other services, keyed by the kind of the copy shown. */
  'versions.sent': slot.keyed(),
  /** The published app's health on the Overview. */
  'overview.liveHealth': slot.single(),
  /** The project's workspaces on the Overview. */
  'overview.workspaces': slot.single(),
  /** Where the project is published, above the chat's message box. */
  'chat.publishStatus': slot.single<{ projectKey: string }>(),
})

export type StudioSlots = typeof studioSlots

/** One contribution to a Studio slot, as an addon's studio.slots.ts lists it. */
export type StudioSlotContribution = SlotContributionOf<StudioSlots>
