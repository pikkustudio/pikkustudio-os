import { DEFAULT_LOGO, logoGeometry, logoSvg } from '@pikkustudio/blob/core'

export const BLOB_LOGO = logoGeometry(DEFAULT_LOGO)

export const blobLogoSvg = (color = 'currentColor') => logoSvg(DEFAULT_LOGO, color)
