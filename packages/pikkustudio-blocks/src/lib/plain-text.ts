/** One-line, markdown-free version of a chat message, for previews. Tolerates half-finished markdown while text is still arriving. */
export const plainText = (markdown: string): string =>
  markdown
    .replace(/```[^\n]*\n?([\s\S]*?)(```|$)/g, ' $1 ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/(\*\*|__|~~|\*|_|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
