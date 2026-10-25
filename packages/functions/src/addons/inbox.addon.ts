import { wireAddon } from '#pikku/addon'

wireAddon({
  name: 'inbox',
  package: '@pikkustudio/addon-inbox',
  expose: true,
  ui: true,
  // Hands each email the project sends to the Studio inbox, when Studio has set STUDIO_INBOX_URL and STUDIO_INBOX_TOKEN.
  contributors: ['inbox'],
  // Its screens (now the addon's, not core's) find the project through studio:listProjects.
  uses: { '@pikkustudio/addon-studio': 'studio' },
})
