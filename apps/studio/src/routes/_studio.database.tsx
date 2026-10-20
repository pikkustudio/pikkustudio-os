import { createFileRoute } from '@tanstack/react-router'
import { DatabaseScreen } from '@pikkustudio/blocks/screens/DatabaseScreen'

export const Route = createFileRoute('/_studio/database')({ component: DatabaseScreen })
