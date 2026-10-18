import { defineScope } from '@pikku/core/scope'

defineScope({
  inbox: {
    displayName: 'Inbox',
    description: 'The messages a project app sent while it ran under Studio',
    scopes: {
      read: { description: 'See the messages a project app sent' },
    },
  },
})
