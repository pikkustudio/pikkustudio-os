import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DIRECTIONS_REFERENCES = ['craft-floor.md', 'typeset.md', 'layout.md', 'colorize.md']

export const DIRECTIONS_SKILL = `---
name: directions
description: Use when making one design direction for a new app: one self-contained page and a small artifact.json.
---

You make one design direction. The whole deliverable is three files, and you write them first:

1. artifacts/direction-N/index.html: one self-contained page, inline CSS, no scripts, no external files.
2. artifacts/direction-N/artifact.json: {"kind":"Design","title":"...","summary":"...","exploration":"first","mode":"extreme"}.
3. artifacts/direction-N/DESIGN.md: the design language of that page, written from the page you just made, under 2500 characters. It starts with YAML frontmatter holding the tokens: name, description, colors (slug: "#hex"), typography (display, body, and a label style, each with fontFamily, fontSize, fontWeight, lineHeight), rounded, spacing, and components (button-primary, card, tag: backgroundColor, textColor, rounded, padding, using {colors.slug} references). After the frontmatter come short sections in this order: Overview (the world and mood in two sentences), Colors (what each colour is for), Typography, Layout (grid, density, rhythm), Shapes, Components (how buttons, cards and tags look and behave), and Do's and Don'ts (four short rules that keep new screens on-brand).

Write all three files before anything else. After that you may read the page once to check it, and then you stop.

Design with commitment: pick a clear world, colour, type and layout from your brief and carry it all the way. Read [reference/craft-floor.md](reference/craft-floor.md) for the quality floor, and [reference/typeset.md](reference/typeset.md), [reference/layout.md](reference/layout.md) and [reference/colorize.md](reference/colorize.md) when you need them.

There is no review process here. Do not take screenshots, do not generate or save images, do not run any build, review or phase command, and never write files outside the project.
`

const hash = createHash('sha256').update(DIRECTIONS_SKILL).update(DIRECTIONS_REFERENCES.join()).digest('hex').slice(0, 8)

export function writeDirectionsSkill(impeccable: string, home = process.env.PIKKU_BUILDER_HOME ?? join(homedir(), '.pikku', 'builder')): string {
  const dir = join(home, 'skills', `directions-${hash}`)
  if (existsSync(join(dir, 'SKILL.md'))) return dir
  const staging = `${dir}.${process.pid}`
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(join(staging, 'reference'), { recursive: true })
  writeFileSync(join(staging, 'SKILL.md'), DIRECTIONS_SKILL)
  for (const file of DIRECTIONS_REFERENCES) {
    const from = join(impeccable, 'reference', file)
    if (existsSync(from)) symlinkSync(from, join(staging, 'reference', file))
  }
  try {
    renameSync(staging, dir)
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    if (!existsSync(dir)) throw error
  }
  return dir
}
