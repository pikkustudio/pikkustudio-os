import type { I18nNode, I18nString } from '@pikku/react'

type TextAttr = 'title' | 'placeholder' | 'alt' | 'label' | 'aria-label' | 'aria-description' | 'aria-placeholder' | 'aria-roledescription' | 'aria-valuetext'

/** Props of an HTML element or a primitive, with the text a person reads typed `I18nNode` / `I18nString` instead of `string`, so our wrappers around them are gated the same way the DOM is. */
export type I18nProps<P> = {
  [K in keyof P]: K extends 'children' ? I18nNode : K extends TextAttr ? I18nString | Exclude<P[K], string> : P[K]
}
