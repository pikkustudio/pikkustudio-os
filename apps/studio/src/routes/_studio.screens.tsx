import { createFileRoute } from '@tanstack/react-router'
import { ScreensScreen } from '@pikkustudio/blocks/screens/ScreensScreen'

export const Route = createFileRoute('/_studio/screens')({ component: ScreensScreen })
