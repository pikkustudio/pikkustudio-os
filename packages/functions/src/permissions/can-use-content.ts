import { pikkuPermission } from '#pikku/auth'

export const canUseContent = pikkuPermission(async ({ content }) => !!content)
