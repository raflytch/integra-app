import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** Registers the DESIGN.md type scale and tracking so merges keep them apart from text colors. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'overline',
        'caption',
        'small',
        'body',
        'subhead',
        'section',
        'headline',
      ],
      tracking: ['display'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
