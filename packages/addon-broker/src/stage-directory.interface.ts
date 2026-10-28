import type { StageContext } from './stage-context.js'

/**
 * Maps an API key to the stage it belongs to. Locally one directory holds every
 * stage on the machine; in cloud it holds the single stage the broker runs in.
 */
export interface StageDirectory {
  resolve(apiKey: string): Promise<StageContext | null>
}
