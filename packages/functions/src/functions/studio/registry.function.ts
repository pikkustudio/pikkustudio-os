import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import {
  addDependency,
  declaredDependency,
  functionsDir,
  getOpenApi,
  getPackage,
  OpenApiEntry,
  PackageDetail,
  PackageEntry,
  searchOpenApis,
  searchPackages,
} from '../../lib/registry.js'

export const SearchRegistryInput = z.object({ query: z.string() })
export const SearchRegistryOutput = z.object({
  addons: z.array(
    z.object({ name: z.string(), version: z.string(), description: z.string(), author: z.string().optional() }),
  ),
  openapis: z.array(z.object({ name: z.string(), provider: z.string(), title: z.string(), description: z.string() })),
})

export const searchRegistry = pikkuSessionlessFunc({
  description: 'Search the addon registry for a published addon or an OpenAPI spec for an external service.',
  input: SearchRegistryInput,
  output: SearchRegistryOutput,
  func: async (_services, { query }) => {
    const [addons, openapis] = await Promise.all([searchPackages(query), searchOpenApis(query)])
    return {
      addons: addons.map(({ name, version, description, author }: PackageEntry) => ({
        name,
        version,
        description,
        author,
      })),
      openapis: openapis.map(({ name, provider, title, description }: OpenApiEntry) => ({
        name,
        provider,
        title,
        description,
      })),
    }
  },
})

export const GetRegistryEntryInput = z.object({ name: z.string() })
export const GetRegistryEntryOutput = z.object({
  addon: z
    .object({
      name: z.string(),
      version: z.string(),
      description: z.string(),
      functions: z.array(z.string()),
      secrets: z.array(z.string()),
    })
    .nullable(),
  openapi: z
    .object({
      name: z.string(),
      provider: z.string(),
      title: z.string(),
      swaggerUrl: z.string(),
      totalOperations: z.number().optional(),
      securitySchemes: z.array(z.string()),
      servers: z.array(z.string()),
    })
    .nullable(),
})

export const getRegistryEntry = pikkuSessionlessFunc({
  description: 'Show one registry entry: the published addon and the OpenAPI spec that match a name.',
  input: GetRegistryEntryInput,
  output: GetRegistryEntryOutput,
  func: async (_services, { name }) => {
    const [addon, openapi] = await Promise.all([getPackage(name), getOpenApi(name)])
    return {
      addon: addon
        ? {
            name: addon.name,
            version: addon.version,
            description: addon.description,
            functions: Object.keys(addon.functions ?? {}),
            secrets: Object.values(addon.secrets ?? {})
              .map((s) => s.secretId)
              .filter((s): s is string => Boolean(s)),
          }
        : null,
      openapi: openapi
        ? {
            name: openapi.name,
            provider: openapi.provider,
            title: openapi.title,
            swaggerUrl: openapi.swaggerUrl,
            totalOperations: openapi.totalOperations,
            securitySchemes: openapi.securitySchemes ?? [],
            servers: openapi.servers ?? [],
          }
        : null,
    }
  },
})

export const InstallAddonInput = z.object({ key: z.string(), name: z.string() })
export const InstallAddonOutput = z.object({
  status: z.enum(['installed', 'already-installed', 'not-found', 'failed']),
  package: z.string().nullable(),
  version: z.string().nullable(),
  functions: z.array(z.string()),
  secrets: z.array(z.string()),
  credentials: z.array(z.string()),
  message: z.string(),
})

const result = (
  status: z.infer<typeof InstallAddonOutput>['status'],
  message: string,
  addon?: PackageDetail,
) => ({
  status,
  package: addon?.name ?? null,
  version: addon?.version ?? null,
  functions: Object.keys(addon?.functions ?? {}),
  secrets: Object.values(addon?.secrets ?? {})
    .map((s) => s.secretId)
    .filter((s): s is string => Boolean(s)),
  credentials: Object.entries(addon?.credentials ?? {}).map(([k, c]) => c.displayName ?? c.name ?? k),
  message,
})

export const installAddon = pikkuSessionlessFunc({
  description: "Install a published addon into a project's functions package.",
  input: InstallAddonInput,
  output: InstallAddonOutput,
  func: async ({ studio }, { key, name }) => {
    const addon = await getPackage(name)
    if (!addon) {
      const spec = await getOpenApi(name)
      return result(
        'not-found',
        spec
          ? `"${name}" is only an OpenAPI spec (${spec.swaggerUrl}); generating an addon from a spec is not in Studio yet.`
          : `Nothing named "${name}" in the registry. Search for the exact name.`,
      )
    }
    const dir = await functionsDir(await studio.projects.projectDir(key))
    if (await declaredDependency(dir, addon.name)) {
      return result('already-installed', `${addon.name} is already a dependency.`, addon)
    }
    const added = await addDependency(dir, `${addon.name}@^${addon.version}`)
    if (!added.ok) return result('failed', `Could not install ${addon.name}: ${added.output}`, addon)
    return result('installed', `Installed ${addon.name}@${addon.version}.`, addon)
  },
})
