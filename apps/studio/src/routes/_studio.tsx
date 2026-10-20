import { createFileRoute } from '@tanstack/react-router'
import { ShellLayout } from '@pikkustudio/blocks/screens/ShellLayout'
import { requireStudioSession } from '@/lib/studio-gate'

export const Route = createFileRoute('/_studio')({ beforeLoad: requireStudioSession, component: ShellLayout })
