import { createFileRoute } from '@tanstack/react-router'
import { ChooseAiScreen } from '@pikkustudio/blocks/screens/ChooseAiScreen'
import { localScreen } from '@pikkustudio/blocks/blocks/WebEditionUnavailable'

export const Route = createFileRoute('/_welcome/choose-ai')({ component: localScreen('choose-ai', ChooseAiScreen) })
