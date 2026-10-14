const ASK_MARKER = '[[ask:'

export type Answer = { question: string; answer: string; skipped: boolean }

export const ideaWithAnswers = (idea: string, answers: Answer[]) => {
  const given = answers.filter((a) => !a.skipped && a.answer.trim())
  if (!given.length) return idea
  const notes = given.map((a, i) => `${i + 1}. ${a.question}\n${a.answer.trim()}`).join('\n\n')
  return `${idea}\n\nThe owner was asked a few questions about this product before these designs. What follows are the questions and their answers. They may be brief or imprecise, so treat them as hints that shape each direction, and let the idea above decide anything they leave open.\n\n${notes}`
}

export const lastAskedQuestion = (items: { kind: string; text?: string }[]): string | null => {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    if (item.kind === 'user') return null
    if (item.kind === 'assistant' && item.text?.includes(ASK_MARKER)) {
      const raw = /\[\[ask:(\{.*\})\]\]/s.exec(item.text)?.[1]
      if (!raw) return null
      try {
        const question = (JSON.parse(raw) as { question?: unknown }).question
        return typeof question === 'string' && question.trim() ? question.trim() : null
      } catch {
        return null
      }
    }
  }
  return null
}

export const BACKEND_PROMPT =
  'Make the app real. For every screen that still shows sample information, write the real function and the database tables it needs, wire the screen to them, add the permissions each kind of person needs, and remove the sample files once nothing uses them. Run the checks listed in AGENTS.md before you stop.'

export const TESTS_PROMPT =
  'Write scenarios for the main things people do in this app, run them until they pass, and generate the guide pages from the scenario runs. Run the checks listed in AGENTS.md before you stop.'

export const FLAGS_PROMPT =
  'The owner wants to publish the app as it is, with sample information in places. Give every screen that still shows sample information a feature flag so it can be published, and build no backend. Run the checks listed in AGENTS.md before you stop.'
