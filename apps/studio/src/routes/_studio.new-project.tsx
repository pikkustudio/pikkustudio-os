import { createFileRoute } from '@tanstack/react-router'
import { NewProjectRoute } from '@pikkustudio/blocks/screens/NewProjectRoute'

export const Route = createFileRoute('/_studio/new-project')({ component: NewProjectRoute })
