import { createFileRoute } from '@tanstack/react-router'
import { FrontDoorsScreen } from '@pikkustudio/blocks/screens/FrontDoorsScreen'

export const Route = createFileRoute('/_studio/front-doors')({ component: FrontDoorsScreen })
