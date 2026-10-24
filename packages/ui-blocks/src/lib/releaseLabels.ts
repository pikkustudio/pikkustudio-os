import { m } from '@/i18n/messages'
import type { I18nString } from '@pikku/react'
import { dayTime } from '../blocks/ShelfMeta'
import type { Release } from './releases'

/** A deploy that was never given a version number reports 0.0.0. */
export const numbered = (v: Pick<Release, 'version'>) => !!v.version && v.version !== '0.0.0'

/** "Version 1.2.0", or when it was published for a release without a number. */
export const versionLabel = (v: Release): I18nString => (numbered(v) ? m.shelf_meta__version_named({ version: v.version }) : m.shelf_meta__published_on({ when: dayTime(v.liveAt ?? v.at) }))

/** The second line under a title: the version number, or that there is none. */
export const versionLine = (v: Release): I18nString => (numbered(v) ? m.versions_screen__version_line({ version: v.version }) : m.shelf_meta__no_number())
