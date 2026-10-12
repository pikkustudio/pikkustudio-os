import { DEFAULT_LOGO, logoGeometry, logoSvg } from '@pikku/blob-studio/core'

export const BLOB_LOGO = logoGeometry(DEFAULT_LOGO)

export const blobLogoSvg = (color = 'currentColor') => logoSvg(DEFAULT_LOGO, color)
