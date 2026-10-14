import { createFileRoute } from '@tanstack/react-router'
import { AddonUisScreen } from '@/screens/AddonUisScreen'

export const Route = createFileRoute('/_studio/addons/')({ component: AddonUisScreen })
