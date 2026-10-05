import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectDiskInput = z.object({ key: z.string() })

export const ProjectDiskOutput = z.object({
  packagesMb: z.number(),
  codeMb: z.number(),
  mediaMb: z.number(),
  otherMb: z.number(),
  freeMb: z.number(),
  skipped: z.number(),
})

export const projectDisk = pikkuSessionlessFunc({
  expose: true,
  description: "How much disk space a project takes, split into installed packages, code, pictures and files, and history and build output.",
  input: ProjectDiskInput,
  output: ProjectDiskOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.disk(key),
})
