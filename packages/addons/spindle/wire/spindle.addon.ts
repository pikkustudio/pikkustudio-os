// A local test addon, not part of the app: `node scripts/link-addon.mjs --test` copies this file into the host's sources.
import { wireAddon } from '@project/functions/.pikku/addon/pikku-addon-types.gen.js'

wireAddon({
  name: 'spindle',
  package: '@pikkustudio/addon-spindle',
  expose: true,
  ui: true,
})
