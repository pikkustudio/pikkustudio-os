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
    `The person's screen is set to ${name}. Write everything you say to them (replies, questions, summaries, explanations, notes and wording meant for them) in the language their latest message is written in, whatever the screen language; if their message does not make the language clear, use ${name}.`,
    'Everything else is always English, whatever language the person speaks: code, comments, identifiers, file and folder names, route names, function and RPC names, database tables and columns, message keys, test ids, CSS class names, mock file names, knowledge note file names, commit messages, branch names, logs, and anything you pass to a tool or to pikku. Only text a person reads on screen or in an email may be in their language.',
  ].join(' ')
}
