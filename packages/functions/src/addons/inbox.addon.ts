import { wireAddon } from '#pikku/addon'

wireAddon({
  name: 'inbox',
  package: '@pikkustudio/addon-inbox',
  expose: true,
  ui: true,
  // Its screens (now the addon's, not core's) find the project through studio:listProjects.
  uses: { '@pikkustudio/addon-studio': 'studio' },
})
