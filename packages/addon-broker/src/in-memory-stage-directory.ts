import { createHash } from 'node:crypto'
import type { StageContext } from './stage-context.js'
import type { StageDirectory } from './stage-directory.interface.js'

const hashKey = (apiKey: string): string => createHash('sha256').update(apiKey).digest('hex')

export class InMemoryStageDirectory implements StageDirectory {
  private stages = new Map<string, StageContext>()

  add(apiKey: string, context: StageContext): void {
    this.stages.set(hashKey(apiKey), context)
  }

  async resolve(apiKey: string): Promise<StageContext | null> {
    return this.stages.get(hashKey(apiKey)) ?? null
  }
}
