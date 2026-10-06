import type { UiMeta } from '../lib/ui-types.js'
import type { MetaRef } from './meta-source.interface.js'

/**
 * The frontend twin of MetaSource. Nothing generates UI meta the way pikku
 * generates function meta, so the host decides where it comes from — a scan of
 * the checked-out app, or a scan of the repo at the sha that shipped.
 */
export interface UiSource {
  read(ref: MetaRef): Promise<UiMeta | null>
}
