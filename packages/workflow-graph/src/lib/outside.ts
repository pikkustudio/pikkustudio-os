import { asI18n, type I18nString } from '@pikku/react'

/** Text that comes from the workflow being drawn (step names, routes, function ids), not from our own copy. A missing value stays missing. */
export const outside = (value: string | undefined): I18nString | undefined => (value === undefined ? undefined : asI18n(value))
