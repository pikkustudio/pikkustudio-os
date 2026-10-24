import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'border-w': [{ border: ['bold'] }],
      rounded: [{ rounded: ['card', 'next', 'empty', 'dev', 'art'] }],
      'font-size': [
        { text: ['px13', 'px14', 'px145', 'px15', 'px16', 'px17', 'px175', 'px20', 'px22', 'px24', 'px26', 'px36', 'px40'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
