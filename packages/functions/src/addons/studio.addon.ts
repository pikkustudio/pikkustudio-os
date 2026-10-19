import { wireAddon } from '#pikku/addon'

wireAddon({
  name: 'studio',
  package: '@pikkustudio/addon-studio',
  secretGrants: ['BETTER_AUTH_SECRET'],
  mcp: true,
})
