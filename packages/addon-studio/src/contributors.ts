import { defineContributors } from '@pikku/core/contributors'
import { studioSources } from './contributors/studio-sources.js'

/** What this addon contributes to a host's services. A host takes it with `wireAddon({ contributors: ['studio-sources'] })`. */
export const contributors = defineContributors({
  'studio-sources': { dev: studioSources, deploy: studioSources },
})
