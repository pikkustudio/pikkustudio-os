import { defineScope } from '@pikku/core/scope'

defineScope({
  email: {
    displayName: 'Email',
    description: 'The emails a project app sent while it ran under Studio',
    scopes: {
      read: { description: 'See the emails a project app sent' },
    },
  },
})
