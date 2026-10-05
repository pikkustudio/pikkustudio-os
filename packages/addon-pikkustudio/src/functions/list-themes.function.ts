import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ListThemesInput = z.object({ key: z.string() })

const Theme = z.object({
  id: z.string(),
  name: z.string(),
  primary: z.string(),
  secondary: z.string().nullable(),
  background: z.string().nullable(),
  foreground: z.string().nullable(),
  heading: z.string(),
  body: z.string(),
  radius: z.string(),
  scheme: z.string(),
})

export const ListThemesOutput = z.object({ active: z.string(), themes: z.array(Theme) })

export const listThemes = pikkuSessionlessFunc({
  expose: true,
  description: "A project's themes, from packages/theme, and which one is in use.",
  input: ListThemesInput,
  output: ListThemesOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.themes(key),
})
