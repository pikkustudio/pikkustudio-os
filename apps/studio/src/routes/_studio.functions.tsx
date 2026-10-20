import { createFileRoute } from '@tanstack/react-router'
import { FunctionsScreen } from '@pikkustudio/blocks/screens/FunctionsScreen'

export const Route = createFileRoute('/_studio/functions')({ component: FunctionsScreen })
