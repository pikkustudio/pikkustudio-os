// A refusal can end in ": /path", the screen that sorts it out (the server that refused says where). The chat shows
// the reason in the server's own words, with a button to that screen.
const FIX = /^(?:Pikku could not take the request: )?([\s\S]*?): (\/\S*)$/

export type ErrorFix = { text: string; fix: string }

export const errorFixOf = (text: string | undefined): ErrorFix | null => {
  const found = text ? FIX.exec(text.trim()) : null
  return found ? { text: found[1]!, fix: found[2]! } : null
}
