import { defineScope } from '@pikku/core/scope'

defineScope({
  diffui: {
    displayName: 'Diff UI',
    description: 'Compare original mocks with the built prototype',
    scopes: {
      read: { description: 'See screenshot comparisons' },
    },
  },
})
