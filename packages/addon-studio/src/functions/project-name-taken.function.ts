import { z } from 'zod'
import { ConflictError } from '@pikku/core/errors'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectNameTakenInput = z.object({ name: z.string() })

export const projectNameTaken = pikkuSessionlessFunc({
  expose: true,
  description: 'Whether you already have a project with this name. Answers 409 if so.',
  input: ProjectNameTakenInput,
  func: async ({ studioProjects }, { name }) => {
    if (await studioProjects.nameTaken(name)) throw new ConflictError(`You already have a project called ${name}`)
  },
})
