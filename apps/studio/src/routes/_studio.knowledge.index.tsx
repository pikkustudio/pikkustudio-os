import { createFileRoute } from '@tanstack/react-router'
import { KnowledgeScreen } from '@pikkustudio/blocks/screens/KnowledgeScreen'

export const Route = createFileRoute('/_studio/knowledge/')({ component: KnowledgeScreen })
