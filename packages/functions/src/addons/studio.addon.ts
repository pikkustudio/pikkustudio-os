import { wireAddon } from '#pikku/addon'

wireAddon({
  name: 'studio',
  package: '@pikkustudio/addon-studio',
  expose: true,
  secretGrants: ['BETTER_AUTH_SECRET'],
  mcp: true,
  contributors: ['studio-sources'],
})
