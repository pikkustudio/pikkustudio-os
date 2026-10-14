import { Generator, getConfig } from '@tanstack/router-generator'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname, 'apps/studio')
const config = getConfig({ target: 'react', routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }, root)
await new Generator({ config, root }).run()
