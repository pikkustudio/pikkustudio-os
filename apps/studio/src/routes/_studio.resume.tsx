import { createFileRoute } from '@tanstack/react-router'
import { ResumeScreen } from '@pikkustudio/blocks/screens/ResumeScreen'
import { localScreen } from '@pikkustudio/blocks/blocks/WebEditionUnavailable'

export const Route = createFileRoute('/_studio/resume')({ component: localScreen('resume', ResumeScreen) })
