import { createFileRoute } from '@tanstack/react-router'
import { AuditScreen } from '@pikkustudio/blocks/screens/AuditScreen'

export const Route = createFileRoute('/_studio/audit')({ component: AuditScreen })
