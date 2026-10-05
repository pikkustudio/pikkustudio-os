import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ListVersionsInput = z.object({ key: z.string() })

const Commit = z.object({ sha: z.string(), title: z.string(), summary: z.string(), by: z.string(), at: z.number() })

export const ListVersionsOutput = z.object({ live: z.array(Commit), ahead: z.array(Commit) })

export const listVersions = pikkuSessionlessFunc({
  expose: true,
  description: "A project's versions: what has gone live, newest first, and the saved changes that are not live yet.",
  input: ListVersionsInput,
  output: ListVersionsOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.versions(key),
})
