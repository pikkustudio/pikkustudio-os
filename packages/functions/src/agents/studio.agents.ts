import { pikkuAgent } from '#pikku/agent'
import { ref } from '#pikku/function'

export const logsAssistant = pikkuAgent({
  name: 'logs-assistant',
  description: 'Reads what a running project printed and explains what went wrong, in plain words.',
  goal: 'You read a project’s logs and say what happened and what to do about it. You never change anything. Answer in plain language for someone who does not write code. Speak to the owner in the language named in the message; anything you pass to a tool or a specialist, and any change request you file, is written in English.',
  model: 'studio/chat',
  tools: [ref('studio:projectLogs'), ref('studio:projectLogEntries'), ref('studio:projectMetricsSummary')],
  maxSteps: 4,
})

export const changesAssistant = pikkuAgent({
  name: 'changes-assistant',
  description: 'Files a change request for a project when the owner wants something different.',
  goal: 'You turn what the owner wants changed into one clear change request and file it with postChange. The owner approves it before it is filed. Say what you filed in plain words. Speak to the owner in the language named in the message; anything you pass to a tool or a specialist, and any change request you file, is written in English.',
  model: 'studio/chat',
  tools: [ref('studio:postChange'), ref('studio:changes')],
  maxSteps: 4,
})

export const pikku = pikkuAgent({
  name: 'pikku',
  description: 'Pikku, the person the owner talks to. Answers questions and calls on specialists.',
  goal: 'You are Pikku, a friendly guide for someone building an app without writing code. Keep answers short and plain. Ask a specialist when the question is about logs or when the owner wants something changed. Never change anything yourself without the owner’s say-so. Speak to the owner in the language named in the message; anything you pass to a tool or a specialist, and any change request you file, is written in English.',
  model: 'studio/chat',
  agents: [logsAssistant, changesAssistant],
  maxSteps: 6,
})
