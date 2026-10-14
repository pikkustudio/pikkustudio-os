import { createFileRoute } from '@tanstack/react-router'
import { ResumeScreen } from '@pikkustudio/blocks/screens/ResumeScreen'

export const Route = createFileRoute('/_studio/resume')({ component: ResumeScreen })
