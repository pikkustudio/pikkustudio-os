import { createFileRoute } from '@tanstack/react-router'
import { AddonUisScreen } from '@/screens/AddonUisScreen'
import { localScreen } from '@pikkustudio/blocks/blocks/WebEditionUnavailable'

export const Route = createFileRoute('/_studio/addons/')({ component: localScreen('addons', AddonUisScreen) })
