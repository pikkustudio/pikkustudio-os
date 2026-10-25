import { defineContributors } from '@pikku/core/contributors'
import { inboxContributor } from './contributors/inbox.contributor.js'

export const contributors = defineContributors({
  inbox: { dev: inboxContributor, deploy: inboxContributor },
})
