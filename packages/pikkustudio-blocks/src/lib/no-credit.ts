// The builder's AI was refused for want of credit. Pikku Studio Cloud's account says so in one English sentence (the
// server can't translate; builder transcripts keep text): "Add credit to <team> to build with Pikku Studio Cloud AI",
// then ": <path>" to that team's billing page. The chat reads it back to say it in the person's language with the link.
const NO_CREDIT = /Add credit to (.+?) to build with Pikku Studio Cloud AI(?:: (\/\S*))?/

export type NoCredit = { org: string; fix: string | null }

export const noCreditOf = (text: string | undefined): NoCredit | null => {
  const found = text ? NO_CREDIT.exec(text) : null
  return found ? { org: found[1]!, fix: found[2] ?? null } : null
}
