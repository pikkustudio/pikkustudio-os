import { createFileRoute } from '@tanstack/react-router'
import { CodeScreen } from '@pikkustudio/blocks/screens/CodeScreen'

export const Route = createFileRoute('/_studio/code/$')({ component: CodeScreen })
