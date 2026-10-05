import { defineScope } from '@pikku/core/scope'

defineScope({
  spindle: {
    displayName: 'Spindle',
    description: 'The asset library and its knowledge bases',
    scopes: {
      read: { description: 'See the library, knowledge bases and proposals' },
      write: { description: 'Add assets, file them, and decide proposals' },
    },
  },
})
