import { createFileRoute } from '@tanstack/react-router'
import { DesignScreen } from '@pikkustudio/blocks/screens/DesignScreen'

export const Route = createFileRoute('/_studio/design/parts/$lens/')({ component: DesignScreen })
