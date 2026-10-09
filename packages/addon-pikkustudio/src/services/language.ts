const TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/

const nameOf = (tag: string) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(tag)
  } catch {
    return undefined
  }
}

/** What the agent is told about the language it speaks: the person's words in their language, everything pikku or code in English. */
export const languageRule = (tag?: string): string | undefined => {
  if (!tag || !TAG.test(tag)) return undefined
  const name = nameOf(tag)
  if (!name || name === tag) return undefined
  return [
    `The person you are working with reads ${name}. Write everything you say to them in ${name}: replies, questions, summaries and explanations.`,
    'Everything else stays in English: code, comments, identifiers, file and folder names, commit messages, logs, and anything you pass to a tool or to pikku.',
  ].join(' ')
}
