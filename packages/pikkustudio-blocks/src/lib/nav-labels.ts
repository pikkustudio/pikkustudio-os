import { asI18n, type I18nString } from '@pikku/react'
import type { LucideIcon } from 'lucide-react'
import { m } from '@/i18n/messages'
import { navIcons } from '@/nav-icons.gen'

// The registry names messages and icons by key (src/nav.gen.json); gen-addons.mjs checks each one exists.
const messages = m as unknown as Record<string, (() => I18nString) | undefined>
export const msg = (key: string): I18nString => messages[key]?.() ?? asI18n(key)
export const navIcon = (name: string): LucideIcon => navIcons[name]!
