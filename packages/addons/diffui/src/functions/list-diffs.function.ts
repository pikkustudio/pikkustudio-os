import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pikkuFunc } from '#pikku/addon/function'
import { pairDiffs, type DiffPair } from '../diffs.js'

export const diffuiList = pikkuFunc<void, { dir: string; pairs: DiffPair[] }>({
  expose: true,
  scopes: ['diffui:read'],
  func: async () => {
    const dir = process.env.DIFFUI_DIR ?? join(process.cwd(), 'artifacts', 'diffui', 'prototype')
    const files = await readdir(dir).catch(() => [])
    return { dir, pairs: pairDiffs(files) }
  },
})
