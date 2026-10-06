import { defineScope } from '@pikku/core/scope'

defineScope({
  review: {
    displayName: 'Review',
    description: 'Judging what good and bad code looks like, and feeding it back',
    scopes: {
      platform: {
        displayName: 'Platform review',
        description: 'Review any project, and cast verdicts that inform every project',
        scopes: {
          code: { description: 'Functions, workflows and agents as written' },
          knowledge: { description: 'Assumptions and logic, as questions to answer' },
          ui: { description: 'Components, hooks and contexts as written' },
        },
      },
      project: {
        displayName: 'Project review',
        description:
          "Review one organization's own projects, and cast verdicts that stay with them",
        scopes: {
          code: { description: 'Functions, workflows and agents as written' },
          knowledge: { description: 'Assumptions and logic, as questions to answer' },
          ui: { description: 'Components, hooks and contexts as written' },
        },
      },
    },
  },
})
